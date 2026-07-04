import fs from 'node:fs'
import path from 'node:path'
import { createClient, type Client } from '@libsql/client'
import type { KvEntry, StorageAdapter } from '@/lib/storage/types'

/**
 * Ensure the parent directory exists for an on-disk `file:` libSQL URL. Skipped
 * for in-memory (`:memory:`) and remote (`libsql://`, `http`) targets.
 */
function ensureParentDir(url: string): void {
  if (!url.startsWith('file:')) return
  const filePath = url.slice('file:'.length)
  if (!filePath || filePath.startsWith(':')) return
  const dir = path.dirname(filePath)
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function live(expiresAt: unknown, now: number): boolean {
  return expiresAt === null || expiresAt === undefined || Number(expiresAt) > now
}

/**
 * libSQL-backed {@link StorageAdapter}. Durable and, against a remote
 * (`libsql://`/Turso) URL, shared across instances. Backed by a single
 * `storage_kv` table keyed by `(namespace, key)` with an optional `expires_at`.
 */
export function createLibsqlAdapter(url: string, authToken?: string): StorageAdapter {
  let clientPromise: Promise<Client> | null = null

  const getClient = (): Promise<Client> => {
    if (!clientPromise) {
      clientPromise = (async () => {
        ensureParentDir(url)
        const client = createClient({ url, authToken })
        await client.execute(`CREATE TABLE IF NOT EXISTS storage_kv (
          namespace TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          expires_at INTEGER,
          PRIMARY KEY (namespace, key)
        )`)
        return client
      })()
      // Drop a failed init so the next call retries instead of wedging.
      clientPromise.catch(() => {
        clientPromise = null
      })
    }
    return clientPromise
  }

  const UPSERT = `INSERT INTO storage_kv (namespace, key, value, expires_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(namespace, key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`

  return {
    async kvGet(namespace, key) {
      const client = await getClient()
      const res = await client.execute({
        sql: 'SELECT value, expires_at FROM storage_kv WHERE namespace = ? AND key = ?',
        args: [namespace, key],
      })
      const row = res.rows[0]
      if (!row) return null
      if (!live(row.expires_at, Date.now())) {
        await client.execute({ sql: 'DELETE FROM storage_kv WHERE namespace = ? AND key = ?', args: [namespace, key] })
        return null
      }
      return JSON.parse(String(row.value))
    },

    async kvSet(namespace, key, value, options) {
      const client = await getClient()
      const expiresAt = options?.ttlMs ? Date.now() + options.ttlMs : null
      await client.execute({ sql: UPSERT, args: [namespace, key, JSON.stringify(value ?? null), expiresAt] })
    },

    async kvDelete(namespace, key) {
      const client = await getClient()
      await client.execute({ sql: 'DELETE FROM storage_kv WHERE namespace = ? AND key = ?', args: [namespace, key] })
    },

    async kvList<T = unknown>(namespace: string): Promise<Array<KvEntry<T>>> {
      const client = await getClient()
      const now = Date.now()
      const res = await client.execute({
        sql: 'SELECT key, value, expires_at FROM storage_kv WHERE namespace = ?',
        args: [namespace],
      })
      const out: Array<KvEntry<T>> = []
      const expired: Array<string> = []
      for (const row of res.rows) {
        if (live(row.expires_at, now)) out.push({ key: String(row.key), value: JSON.parse(String(row.value)) as T })
        else expired.push(String(row.key))
      }
      if (expired.length) {
        const placeholders = expired.map(() => '?').join(', ')
        await client.execute({
          sql: `DELETE FROM storage_kv WHERE namespace = ? AND key IN (${placeholders})`,
          args: [namespace, ...expired],
        })
      }
      return out
    },

    async kvIncrement(namespace, key, options) {
      const client = await getClient()
      const amount = options?.amount ?? 1
      const now = Date.now()
      // Read-modify-write in a transaction so concurrent increments stay atomic.
      const tx = await client.transaction('write')
      try {
        const res = await tx.execute({
          sql: 'SELECT value, expires_at FROM storage_kv WHERE namespace = ? AND key = ?',
          args: [namespace, key],
        })
        const row = res.rows[0]
        let count: number
        let expiresAt: number | null
        if (row && live(row.expires_at, now)) {
          const current = Number(JSON.parse(String(row.value)))
          count = (Number.isFinite(current) ? current : 0) + amount
          expiresAt = row.expires_at === null || row.expires_at === undefined ? null : Number(row.expires_at)
        } else {
          count = amount
          expiresAt = options?.ttlMs ? now + options.ttlMs : null
        }
        await tx.execute({ sql: UPSERT, args: [namespace, key, JSON.stringify(count), expiresAt] })
        await tx.commit()
        return { count, expiresAt }
      } catch (err) {
        await tx.rollback()
        throw err
      }
    },

    async clear(namespace) {
      const client = await getClient()
      if (namespace) await client.execute({ sql: 'DELETE FROM storage_kv WHERE namespace = ?', args: [namespace] })
      else await client.execute('DELETE FROM storage_kv')
    },
  }
}
