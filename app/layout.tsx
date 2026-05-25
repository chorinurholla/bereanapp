import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Berean — Biblical Principles Corpus',
  description: 'A complete chapter-by-chapter documentation of timeless principles from all 66 books of the Bible. Genesis through Revelation.',
  keywords: ['Bible', 'devotional', 'principles', 'Scripture', 'daily devotion'],
  openGraph: {
    title: 'Berean — Biblical Principles Corpus',
    description: 'Ask anything from Scripture. 5,956 principles. 66 books. Every chapter.',
    siteName: 'Berean',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#080b10',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              border: '1px solid rgba(201,168,76,0.3)',
              color: 'var(--gold)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
            },
          }}
        />
      </body>
    </html>
  )
}
