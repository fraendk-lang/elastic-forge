import { useEffect, useRef, useState } from 'react'
import {
  getAllTextures,
  saveTexture,
  deleteTexture,
  fileToTexture,
  type StoredTexture,
} from '../lib/textureStore'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (textureId: string) => void
  selectedId?: string
}

export default function AssetLibrary({ open, onClose, onSelect, selectedId }: Props) {
  const [textures, setTextures] = useState<StoredTexture[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      getAllTextures().then(setTextures).catch(() => {})
    }
  }, [open])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const tex = await fileToTexture(file)
      await saveTexture(tex)
      setTextures((prev) => [tex, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen.')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    await deleteTexture(id)
    setTextures((prev) => prev.filter((t) => t.id !== id))
  }

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 950 }}
      />
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480,
          maxHeight: '80vh',
          background: 'rgba(14, 14, 16, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(182, 160, 255, 0.2)',
          borderRadius: 14,
          zIndex: 960,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#fff', fontWeight: 600 }}>Asset Library</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Upload */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(182, 160, 255, 0.15)',
              border: '1px solid rgba(182, 160, 255, 0.3)',
              borderRadius: 8,
              color: '#b6a0ff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Lade hoch...' : 'Textur hochladen (PNG/JPG/WebP, max 4 MB)'}
          </button>
          {error && <div style={{ color: '#ff6b6b', fontSize: 11, marginTop: 6 }}>{error}</div>}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {textures.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: 24 }}>
              Noch keine Texturen
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {textures.map((tex) => (
              <div
                key={tex.id}
                onClick={() => onSelect(tex.id)}
                style={{
                  position: 'relative',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: tex.id === selectedId ? '2px solid #b6a0ff' : '2px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  aspectRatio: '1',
                }}
              >
                <img
                  src={tex.dataUrl}
                  alt={tex.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(0,0,0,0.7)',
                  padding: '4px 6px',
                  fontSize: 9,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {tex.name}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(tex.id)
                  }}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    color: '#ff6b6b',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
          Klick auf Textur zum Auswählen · ✕ zum Löschen
        </div>
      </div>
    </>
  )
}
