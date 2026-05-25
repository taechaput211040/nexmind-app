'use client'
import { useState, useEffect } from 'react'

export default function PipelineToast() {
  const [toast, setToast] = useState<{ summary: string } | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onDone(e: Event) {
      const { summary } = (e as CustomEvent<{ summary: string }>).detail
      setToast({ summary })
      setVisible(true)
      const hideTimer = setTimeout(() => setVisible(false), 6000)
      const clearTimer = setTimeout(() => setToast(null), 6500)
      return () => { clearTimeout(hideTimer); clearTimeout(clearTimer) }
    }
    window.addEventListener('nexmind:pipeline-done', onDone)
    return () => window.removeEventListener('nexmind:pipeline-done', onDone)
  }, [])

  if (!toast) return null

  return (
    <div
      style={{
        position: 'fixed', top: 20, right: 24, zIndex: 99999,
        width: 340,
        background: 'color-mix(in srgb, #07071a 80%, transparent)',
        border: '1px solid color-mix(in srgb, #22c55e 45%, transparent)',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 0 32px color-mix(in srgb, #22c55e 18%, transparent), 0 8px 32px rgba(0,0,0,.5)',
        backdropFilter: 'blur(20px)',
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(110%) scale(0.96)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'color-mix(in srgb, #22c55e 14%, transparent)',
          border: '1px solid color-mix(in srgb, #22c55e 30%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
          animation: 'glow-pulse 2s ease-in-out infinite',
        }}>
          ✅
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 10, fontWeight: 700,
            color: '#4ade80',
            fontFamily: "'Space Mono', monospace", letterSpacing: 1.5,
            marginBottom: 4,
          }}>
            ⚡ PIPELINE COMPLETE
          </p>
          <p style={{
            margin: 0, fontSize: 11, color: 'var(--cmd-text-soft)',
            lineHeight: 1.55,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}>
            {toast.summary}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={() => { setVisible(false); setTimeout(() => setToast(null), 400) }}
          style={{
            background: 'none', border: 'none',
            color: 'var(--cmd-label)', cursor: 'pointer',
            fontSize: 14, lineHeight: 1, flexShrink: 0, padding: 2,
          }}
        >×</button>
      </div>

      {/* Progress bar */}
      <div style={{
        marginTop: 10, height: 2, borderRadius: 1,
        background: 'var(--magic-glass-border)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #22c55e, #4ade80)',
          borderRadius: 1,
          animation: visible ? 'toast-drain 6s linear forwards' : 'none',
        }} />
      </div>

      <style>{`
        @keyframes toast-drain {
          from { width: 100% }
          to   { width: 0% }
        }
      `}</style>
    </div>
  )
}
