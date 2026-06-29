import { Suspense } from 'react'
import { AdminLoginForm } from '@/components/admin/admin-login-form'

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  )
}
