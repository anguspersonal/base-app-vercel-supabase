import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

interface LayoutProps {
  children: ReactNode
  showNavbar?: boolean
  showFooter?: boolean
  className?: string
}

export function Layout({
  children,
  showNavbar = true,
  showFooter = true,
  className,
}: LayoutProps) {
  return (
    <div className={`flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950 ${className ?? ''}`}>
      {showNavbar && <Navbar />}
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </div>
  )
}
