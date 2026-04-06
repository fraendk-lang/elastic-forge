import { useState, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import {
  loadSnapshots,
  pruneAutoSnapshots,
  MAX_SNAPSHOTS,
  SNAPSHOTS_KEY,
  formatRelative,
  type StoredSnapshot,
} from '../lib/workspaceCatalog'

interface Props {
  open: boolean
  onClose: () => void
}

export default function VersionHistorySidebar({ open, onClose }: Props) {
  const {
    projectName,
    fragmentShader,
    uniforms,
    restoreFromSnapshot,
    getLayersPayload,
  } = useProject()

  const [snapshots, setSnapshots] = useState<StoredSnapshot[]>([])
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)

  // Load snapshots on open
  useEffect(() => {
    if (open) {
      setSnapshots(pruneAutoSnapshots(loadSnapshots()))
    }
  }, [open])

  function saveMilestone() {
    setSaving(true)
    try {
      const newSnapshot: StoredSnapshot = {
        id: crypto.randomUUID(),
        name: projectName || 'Milestone',
        description,
        createdAt: new Date().toISOString(),
        type: 'manual',
        shaderCode: fragmentShader,
        uniforms: { ...uniforms },
        layers: getLayersPayload(),
        thumbnailDataUrl: undefined,
      }

      const updated = [newSnapshot, ...snapshots].slice(0, MAX_SNAPSHOTS)
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated))
      setSnapshots(updated)
      setDescription('')
    } finally {
      setSaving(false)
    }
  }

  function handleRestore(snapshot: StoredSnapshot) {
    // Auto-save current state before restore
    const autoSave: StoredSnapshot = {
      id: crypto.randomUUID(),
      name: 'Vor Wiederherstellung',
      description: '',
      createdAt: new Date().toISOString(),
      type: 'auto',
      shaderCode: fragmentShader,
      uniforms: { ...uniforms },
      layers: getLayersPayload(),
      thumbnailDataUrl: undefined,
    }
    const current = loadSnapshots()
    const updated = [autoSave, ...current].slice(0, MAX_SNAPSHOTS)
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated))

    // Restore
    restoreFromSnapshot(snapshot)
    setConfirmRestore(null)
    setSnapshots(pruneAutoSnapshots(loadSnapshots()))
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: 320,
        background: 'rgba(14, 14, 16, 0.97)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(182, 160, 255, 0.15)',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#fff', fontWeight: 600 }}>Version History</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      {/* Current Draft */}
      <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Aktueller Entwurf</span>
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Beschreibung (optional)..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '7px 10px',
            color: '#fff',
            fontSize: 12,
            marginBottom: 8,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={saveMilestone}
          disabled={saving}
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
          {saving ? 'Speichern...' : 'Milestone speichern'}
        </button>
      </div>

      {/* Snapshot List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {snapshots.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
            Noch keine Snapshots
          </div>
        )}
        {snapshots.map((snap) => (
          <div
            key={snap.id}
            style={{
              padding: '10px 16px',
              borderLeft: snap.type === 'manual' ? '3px solid #b6a0ff' : '3px solid rgba(255,255,255,0.1)',
              marginBottom: 2,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: snap.type === 'manual' ? 600 : 400 }}>
                {snap.name}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: snap.type === 'manual' ? 'rgba(182,160,255,0.15)' : 'rgba(255,255,255,0.05)',
                  color: snap.type === 'manual' ? '#b6a0ff' : 'rgba(255,255,255,0.3)',
                }}
              >
                {snap.type === 'manual' ? 'Milestone' : 'Auto'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
              {formatRelative(snap.createdAt)}
            </div>
            {snap.description && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {snap.description}
              </div>
            )}

            {/* Restore button */}
            {confirmRestore === snap.id ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button
                  onClick={() => handleRestore(snap)}
                  style={{ flex: 1, padding: '5px 8px', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 6, color: '#ff6b6b', fontSize: 11, cursor: 'pointer' }}
                >
                  Wiederherstellen
                </button>
                <button
                  onClick={() => setConfirmRestore(null)}
                  style={{ padding: '5px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}
                >
                  Abbruch
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRestore(snap.id)}
                style={{ marginTop: 4, padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer' }}
              >
                Wiederherstellen
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
