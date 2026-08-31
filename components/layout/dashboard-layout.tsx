'use client'

import { AppShell } from './app-shell'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
