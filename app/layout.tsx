import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ReactQueryProvider } from '@/lib/react-query'
import { NextAuthSessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'

// Vendored rather than fetched with next/font/google, which downloads from
// Google Fonts during `next build`. That made the build depend on a third
// party at build time and failed outright on arm64, where the request is slow
// enough under emulation to time out. See app/fonts/README.md.
const inter = localFont({
  src: './fonts/inter-latin-variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'TorrenClou - Torrent to Cloud',
  description: 'Download torrents directly to your Google Drive',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <NextAuthSessionProvider>
            <ReactQueryProvider>
              {children}
              <Toaster position="top-right" richColors />
            </ReactQueryProvider>
          </NextAuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


