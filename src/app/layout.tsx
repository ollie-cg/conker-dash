import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Nav from '@/components/nav'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Conker Dash',
  description: 'Conker snacks performance dashboard',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-slate-900">
            <div className="px-6 py-5">
              <h1 className="text-xl font-bold text-white">Conker Dash</h1>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <Nav />
            </div>
          </aside>

          {/* Main content */}
          <main className="ml-60 flex h-screen flex-1 flex-col overflow-hidden bg-slate-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
