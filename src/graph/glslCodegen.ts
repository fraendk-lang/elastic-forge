import type { Edge, Node } from '@xyflow/react'
import { getRegistryEntry } from './nodeRegistry'
import { GLSL_PREAMBLES } from './glslPreambles'

export type GraphNodeData = {
  label?: string
  value?: number
  r?: number
  g?: number
  b?: number
  x?: number
  y?: number
  z?: number
}

function safeVar(id: string) {
  return `n_${id.replace(/-/g, '_')}`
}

/** Detect cycles in graph via DFS */
function hasCycle(nodes: Node[], edges: Edge[]): boolean {
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (!adj.has(e.target)) adj.set(e.target, [])
    adj.get(e.target)!.push(e.source)
  }
  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(id: string): boolean {
    if (inStack.has(id)) return true
    if (visited.has(id)) return false
    visited.add(id)
    inStack.add(id)
    for (const dep of adj.get(id) ?? []) {
      if (dfs(dep)) return true
    }
    inStack.delete(id)
    return false
  }

  for (const n of nodes) {
    if (dfs(n.id)) return true
  }
  return false
}

/** Rekursiv vom Output-Knoten aus: erzeugt Zeilen in korrekter Abhängigkeits-Reihenfolge */
export function buildFragmentShader(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
): { code: string; error?: string } {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const outNode = nodes.find((n) => n.type === 'fragmentOut')
  if (!outNode) {
    return { code: '', error: 'Kein Ausgabe-Knoten (Fragment Out).' }
  }

  if (hasCycle(nodes, edges)) {
    return { code: '', error: 'Zykluserkennung: Der Graph enthält eine Schleife.' }
  }

  const lines: string[] = []
  const emitted = new Set<string>()
  const usedPreambles = new Set<string>()

  function edgeToSource(nodeId: string, handleId: string | null | undefined) {
    const e = edges.find((x) => x.target === nodeId && x.targetHandle === handleId)
    if (!e) return null
    return e.source
  }

  function emitExpr(nodeId: string): string {
    if (emitted.has(nodeId)) return safeVar(nodeId)
    const node = nodeById.get(nodeId)
    if (!node) throw new Error(`Unbekannter Knoten: ${nodeId}`)

    const v = safeVar(nodeId)
    const data = (node.data ?? {}) as GraphNodeData
    const entry = getRegistryEntry(node.type ?? '')

    // Track preamble requirements
    if (entry?.preamble) usedPreambles.add(entry.preamble)

    switch (node.type) {
      case 'uvSource': {
        lines.push(`  vec2 ${v} = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;`)
        break
      }
      case 'timeSource': {
        lines.push(`  float ${v} = u_time * u_speed;`)
        break
      }
      case 'wave': {
        const uvSrc = edgeToSource(nodeId, 'uv')
        const phSrc = edgeToSource(nodeId, 'phase')
        if (!uvSrc || !phSrc) throw new Error('Wave: Verbindungen zu UV und Phase fehlen.')
        const uv = emitExpr(uvSrc)
        const ph = emitExpr(phSrc)
        lines.push(`  float ${v} = sin((${uv}.x + ${uv}.y) * u_scale + ${ph}) * 0.5 + 0.5;`)
        break
      }
      case 'mixFinal': {
        const mSrc = edgeToSource(nodeId, 'mix')
        if (!mSrc) throw new Error('Mix: Eingang fehlt.')
        const m = emitExpr(mSrc)
        lines.push(`  vec3 ${v} = mix(vec3(0.05, 0.05, 0.07), u_color, ${m});`)
        break
      }
      case 'floatConst': {
        const val = Number(data.value ?? 0)
        lines.push(`  float ${v} = ${val.toFixed(6)};`)
        break
      }
      case 'mulFloat': {
        const aSrc = edgeToSource(nodeId, 'a')
        const bSrc = edgeToSource(nodeId, 'b')
        if (!aSrc || !bSrc) throw new Error('Multiply: beide Eingänge (a, b) benötigt.')
        lines.push(`  float ${v} = ${emitExpr(aSrc)} * ${emitExpr(bSrc)};`)
        break
      }
      case 'addFloat': {
        const aSrc = edgeToSource(nodeId, 'a')
        const bSrc = edgeToSource(nodeId, 'b')
        if (!aSrc || !bSrc) throw new Error('Add: beide Eingänge (a, b) benötigt.')
        lines.push(`  float ${v} = ${emitExpr(aSrc)} + ${emitExpr(bSrc)};`)
        break
      }
      case 'fragmentOut': {
        const cSrc = edgeToSource(nodeId, 'color')
        if (!cSrc) throw new Error('Fragment Out: Farbeingang fehlt.')
        const c = emitExpr(cSrc)
        lines.push(`  gl_FragColor = vec4(applyGrade(${c}), 1.0);`)
        emitted.add(nodeId)
        return c
      }
      // ── New node types ──
      case 'noise': {
        const uvSrc = edgeToSource(nodeId, 'uv')
        const scaleSrc = edgeToSource(nodeId, 'scale')
        if (!uvSrc) throw new Error('Noise: UV-Eingang fehlt.')
        const uv = emitExpr(uvSrc)
        const scale = scaleSrc ? emitExpr(scaleSrc) : 'u_scale'
        lines.push(`  float ${v} = snoise(${uv} * ${scale}) * 0.5 + 0.5;`)
        break
      }
      case 'voronoi': {
        const uvSrc = edgeToSource(nodeId, 'uv')
        const scaleSrc = edgeToSource(nodeId, 'scale')
        if (!uvSrc) throw new Error('Voronoi: UV-Eingang fehlt.')
        const uv = emitExpr(uvSrc)
        const scale = scaleSrc ? emitExpr(scaleSrc) : 'u_scale'
        lines.push(`  float ${v} = voronoi(${uv} * ${scale});`)
        break
      }
      case 'texture2D': {
        const uvSrc = edgeToSource(nodeId, 'uv')
        if (!uvSrc) throw new Error('Texture2D: UV-Eingang fehlt.')
        const uv = emitExpr(uvSrc)
        // Procedural checkerboard until Asset Library (Spec 2) adds real textures
        lines.push(`  vec3 ${v} = vec3(mod(floor(${uv}.x * 8.0) + floor(${uv}.y * 8.0), 2.0));`)
        break
      }
      case 'colorPicker': {
        const r = Number(data.r ?? 1.0).toFixed(4)
        const g = Number(data.g ?? 0.5).toFixed(4)
        const b = Number(data.b ?? 0.2).toFixed(4)
        lines.push(`  vec3 ${v} = vec3(${r}, ${g}, ${b});`)
        break
      }
      case 'vec3Const': {
        const x = Number(data.x ?? 0).toFixed(4)
        const y = Number(data.y ?? 0).toFixed(4)
        const z = Number(data.z ?? 0).toFixed(4)
        lines.push(`  vec3 ${v} = vec3(${x}, ${y}, ${z});`)
        break
      }
      default:
        throw new Error(`Unbekannter Knotentyp: ${node.type}`)
    }

    emitted.add(nodeId)
    return v
  }

  try {
    emitExpr(outNode.id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { code: '', error: msg }
  }

  // Collect preamble code
  const preambleCode = [...usedPreambles]
    .map((key) => GLSL_PREAMBLES[key] ?? '')
    .filter(Boolean)
    .join('\n')

  const body = lines.join('\n')
  const code = `precision highp float;
uniform float u_time;
uniform float u_speed;
uniform float u_scale;
uniform vec3 u_color;
uniform float u_intensity;
uniform float u_saturation;
uniform float u_contrast;
uniform float u_gamma;
uniform vec2 u_resolution;

vec3 applyGrade(vec3 col) {
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, clamp(u_saturation, 0.0, 2.0));
  col = (col - 0.5) * u_contrast + 0.5;
  col *= u_intensity;
  float g = max(u_gamma, 0.01);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / g));
  return clamp(col, 0.0, 1.0);
}
${preambleCode}
void main() {
${body}
}
`
  return { code }
}
