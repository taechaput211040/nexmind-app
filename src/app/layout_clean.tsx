import type { Metadata } from 'next'
import { Space_Mono, Inter } from 'next/font/google'
import Sidebar from '@/components/Sidebar'
import './globals.css'

const inter = Inter({ subsets:['latin'], variable:'--font-inter', display:'swap' })
const spaceMono = Space_Mono({ subsets:['latin'], weight:['400','700'], variable:'--font-mono', display:'swap' })

export const metadata: Metadata = {
  title: '⚡ NEXMIND Command Center',
  description: 'TAEC\'s Personal AI Company — Multi-Agent Command Center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${inter.variable} ${spaceMono.variable}`}>
      <body style={{ background:'#000000', color:'var(--text)', minHeight:'100vh' }}>
        {/* Ambient background glow - reduced opacity for pure black */}
        <div
          aria-hidden
          style={{
            position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
            background:'radial-gradient(ellipse 80% 50% at 20% -10%, rgba(108,99,255,.04) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(255,107,157,.03) 0%, transparent 60%)',
          }}
        />
        {/* Sidebar */}
        <Sidebar />
        {/* Main content */}
        <main style={{ marginLeft:220, minHeight:'100vh', position:'relative', zIndex:1 }}>
          {children}
        </main>
      </body>
    </html>
  )
}

