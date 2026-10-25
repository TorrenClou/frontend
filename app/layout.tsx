import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ReactQueryProvider } from '@/lib/react-query'
import { NextAuthSessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'

const inter = localFont({
  src: './fonts/inter-latin-variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
})

export const metadata: Metadata = {
  title: {
    default: 'TorrentDrive — ISP-Blind Torrent to Google Drive & S3',
    template: '%s — TorrentDrive',
  },
  description:
    'Self-hosted ISP-blind torrent-to-Google Drive and S3 cloud downloader with selective file picking and automatic storage failover.',
  applicationName: 'TorrentDrive',
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