import type { ParsedArgs } from '../router.js'
import { run, runFramework } from '../process.js'

const SITE_URL_HINT = process.env.DOX_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL

/**
 * Build, then deploy via a provider adapter. Vercel is the default adapter; if
 * its CLI isn't available we print clear next steps rather than failing hard.
 */
export async function runDeploy(args: ParsedArgs): Promise<number> {
  process.stdout.write('\n  Building production site...\n')
  const buildExit = await runFramework('build', 'build')
  if (buildExit !== 0) return buildExit

  const prod = args.hasFlag('--prod', '--production')
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

  process.stdout.write('\n  Deploying with Vercel...\n')
  const deployExit = await run(npx, ['vercel', 'deploy', ...(prod ? ['--prod'] : [])])

  if (deployExit !== 0) {
    process.stdout.write(
      '\n  Deploy did not complete. To deploy manually:\n' +
        '    • Vercel:     npx vercel deploy --prod\n' +
        '    • Cloudflare: npx wrangler pages deploy\n\n',
    )
    return deployExit
  }

  const base = SITE_URL_HINT ?? '<your-url>'
  process.stdout.write(
    `\n  Deployed. Agent endpoints:\n` +
      `    • ${base}/llms.txt\n` +
      `    • ${base}/ai.txt\n` +
      `    • ${base}/api/docs-index\n\n`,
  )
  return 0
}
