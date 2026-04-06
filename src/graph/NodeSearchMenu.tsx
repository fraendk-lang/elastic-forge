import { useState, useRef, useEffect, useMemo } from 'react'
import { nodeRegistry, CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, type NodeRegistryEntry } from './nodeRegistry'

interface Props {
  position: { x: number; y: number }
  onSelect: (entry: NodeRegistryEntry) => void
  onClose: () => void
}

export default function NodeSearchMenu({ position, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Filter nodes — exclude fragmentOut, uvSource, timeSource (singletons)
  const addableNodes = useMemo(
    () => nodeRegistry.filter((e) => e.type !== 'fragmentOut' && e.type !== 'uvSource' && e.type !== 'timeSource'),
    [],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return addableNodes
    const q = query.toLowerCase()
    return addableNodes.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.typeCode.toLowerCase().includes(q),
    )
  }, [query, addableNodes])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, NodeRegistryEntry[]>()
    for (const cat of CATEGORIES) {
      const items = filtered.filter((e) => e.category === cat)
      if (items.length > 0) map.set(cat, items)
    }
    return map
  }, [filtered])

  // Flat list for keyboard navigation
  const flatList = useMemo(() => {
    const list: NodeRegistryEntry[] = []
    for (const [, items] of grouped) list.push(...items)
    return list
  }, [grouped])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatList[selectedIndex]) onSelect(flatList[selectedIndex])
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
        }}
      />
      {/* Menu */}
      <div
        onKeyDown={handleKeyDown}
        style={{
          position: 'fixed',
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y, window.innerHeight - 400),
          width: 300,
          maxHeight: 380,
          zIndex: 1000,
          background: 'rgba(20, 20, 22, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(182, 160, 255, 0.25)',
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Search input */}
        <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Nodes..."
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#fff',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
          {flatList.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              Keine Treffer
            </div>
          )}
          {[...grouped.entries()].map(([cat, items]) => (
            <div key={cat}>
              <div
                style={{
                  padding: '6px 14px 4px',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS],
                  fontWeight: 600,
                }}
              >
                {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
              </div>
              {items.map((entry) => {
                const idx = flatList.indexOf(entry)
                const isSelected = idx === selectedIndex
                return (
                  <div
                    key={entry.type}
                    onClick={() => onSelect(entry)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 14px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(182, 160, 255, 0.1)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 5,
                        background: `${CATEGORY_COLORS[entry.category]}20`,
                        border: `1px solid ${CATEGORY_COLORS[entry.category]}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: CATEGORY_COLORS[entry.category],
                        flexShrink: 0,
                      }}
                    >
                      ◆
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#fff' }}>{entry.label}</div>
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontFamily: 'ui-monospace, monospace',
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {entry.typeCode}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.25)',
            textAlign: 'center',
          }}
        >
          Esc abbrechen · Enter einfügen
        </div>
      </div>
    </>
  )
}
