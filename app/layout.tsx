import type { Metadata } from 'next'
import './globals.css'
import { SidebarProvider } from '@/lib/contexts/sidebar-context'

export const metadata: Metadata = {
  title: 'Contacts',
  description: 'A modern contact management app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </body>
    </html>
  )
}
