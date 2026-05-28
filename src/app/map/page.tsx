'use client'

import dynamic from 'next/dynamic'

// Load the Kaboom.js game with no SSR — it needs browser APIs
const MapGame = dynamic(() => import('@/components/MapGame'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100vw', height: '100vh', background: '#06080e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#333', fontFamily: '"Courier New",monospace', letterSpacing: 3, fontSize: 13,
    }}>
      LOADING GAME ENGINE...
    </div>
  ),
})

export default function MapPage() {
  return <MapGame />
}
