import { isProjectFile } from '../project/schema'
import type { ProjectLayersPayload } from '../project/layers'
import type { UniformsState } from '../shader/uniforms'

export const SNAPSHOTS_KEY = 'midnightshader:snapshots'
export const FULL_KEY = 'midnightshader:fullProject'
/** Legacy: nur noch für Migration / Anzeige in Einstellungen */
export const GRAPH_LEGACY_KEY = 'midnightshader:graph'
export const WORKSPACE_CHANGED_EVENT = 'midnightshader:workspace-changed'

export const MAX_SNAPSHOTS = 50

export function notifyWorkspaceChanged() {
  window.dispatchEvent(new Event(WORKSPACE_CHANGED_EVENT))
}

export type StoredSnapshot = {
  id: string
  name: string
  description: string
  createdAt: string
  type: 'manual' | 'auto'
  shaderCode: string
  uniforms: UniformsState
  layers: ProjectLayersPayload | null
  /** JPEG-Data-URL, beim Snapshot erzeugt (optional bei älteren Einträgen). */
  thumbnailDataUrl?: string
}

export type CurrentProjectSummary = {
  id: '__current__'
  name: string
  updatedAt: string
}

export type CatalogRow = {
  id: string
  name: string
  updatedAt: string
  kind: 'current' | 'snapshot'
  badge: string
  sizeLabel: string
  thumbnailDataUrl?: string
}

function approxShaderSizeBytes(code: string) {
  return new TextEncoder().encode(code).length
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}

function formatRelative(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} Min.`
  const h = Math.floor(m / 60)
  if (h < 48) return `vor ${h} Std.`
  const d = Math.floor(h / 24)
  return `vor ${d} Tag${d === 1 ? '' : 'en'}`
}

export function loadSnapshots(): StoredSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (x): x is Record<string, unknown> =>
          typeof x === 'object' &&
          x !== null &&
          typeof (x as Record<string, unknown>).id === 'string' &&
          typeof (x as Record<string, unknown>).name === 'string' &&
          typeof (x as Record<string, unknown>).createdAt === 'string' &&
          typeof (x as Record<string, unknown>).shaderCode === 'string',
      )
      .map((x) => ({
        id: x.id as string,
        name: x.name as string,
        description: (x.description as string) ?? '',
        createdAt: x.createdAt as string,
        type: (x.type as 'manual' | 'auto') ?? 'manual',
        shaderCode: x.shaderCode as string,
        uniforms: x.uniforms as UniformsState,
        layers: (x.layers as ProjectLayersPayload) ?? null,
        thumbnailDataUrl: x.thumbnailDataUrl as string | undefined,
      }))
  } catch {
    return []
  }
}

export function pruneAutoSnapshots(snapshots: StoredSnapshot[]): StoredSnapshot[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  return snapshots.filter(
    (s) => s.type === 'manual' || new Date(s.createdAt).getTime() > cutoff,
  )
}

export function loadCurrentSummary(): CurrentProjectSummary | null {
  try {
    const raw = localStorage.getItem(FULL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isProjectFile(parsed)) return null
    return {
      id: '__current__',
      name: parsed.meta.name,
      updatedAt: parsed.meta.updatedAt,
    }
  } catch {
    return null
  }
}

/** Hash 0–360 für dezente Hintergrund-Variation pro Name */
export function hueFromString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

export function buildRecentCards(max = 4): CatalogRow[] {
  const current = loadCurrentSummary()
  const snaps = [...loadSnapshots()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const out: CatalogRow[] = []
  if (current) {
    out.push({
      id: current.id,
      name: current.name,
      updatedAt: current.updatedAt,
      kind: 'current',
      badge: 'Aktives Projekt',
      sizeLabel: '',
    })
  }
  for (const s of snaps) {
    if (out.length >= max) break
    out.push({
      id: s.id,
      name: s.name,
      updatedAt: s.createdAt,
      kind: 'snapshot',
      badge: s.type === 'auto' ? 'Auto' : 'Milestone',
      sizeLabel: formatBytes(approxShaderSizeBytes(s.shaderCode)),
      thumbnailDataUrl: s.thumbnailDataUrl,
    })
  }
  return out.slice(0, max)
}

export function buildAllProjectRows(limit = 12): CatalogRow[] {
  const current = loadCurrentSummary()
  const snaps = loadSnapshots()
  const rows: CatalogRow[] = []

  if (current) {
    rows.push({
      id: current.id,
      name: current.name,
      updatedAt: current.updatedAt,
      kind: 'current',
      badge: 'Aktuell',
      sizeLabel: '',
    })
  }

  for (const s of snaps) {
    rows.push({
      id: s.id,
      name: s.name,
      updatedAt: s.createdAt,
      kind: 'snapshot',
      badge: s.type === 'auto' ? 'Auto' : 'Milestone',
      sizeLabel: formatBytes(approxShaderSizeBytes(s.shaderCode)),
      thumbnailDataUrl: s.thumbnailDataUrl,
    })
  }

  rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return rows.slice(0, limit)
}

export { formatRelative }
