export type HandleType = 'float' | 'vec2' | 'vec3'

export interface HandleDef {
  id: string
  type: HandleType
  label?: string
}

export type NodeCategory = 'math' | 'textures' | 'utilities' | 'constants'

export interface NodeRegistryEntry {
  type: string
  label: string
  category: NodeCategory
  description: string
  typeCode: string
  inputs: HandleDef[]
  outputs: HandleDef[]
  defaultData?: Record<string, unknown>
  /** If set, this GLSL preamble key is required (looked up from glslPreambles) */
  preamble?: string
}

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  math: '#7e51ff',
  textures: '#00e3fd',
  utilities: '#ff6c95',
  constants: '#9c7eff',
}

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  math: 'Math',
  textures: 'Textures',
  utilities: 'Utilities',
  constants: 'Constants',
}

export const nodeRegistry: NodeRegistryEntry[] = [
  // ── Utilities ──
  {
    type: 'uvSource',
    label: 'UV',
    category: 'utilities',
    description: 'Screen-space UV coordinates from gl_FragCoord',
    typeCode: 'UTIL_UV',
    inputs: [],
    outputs: [{ id: 'out', type: 'vec2' }],
  },
  {
    type: 'timeSource',
    label: 'Zeit',
    category: 'utilities',
    description: 'Animation time (u_time × u_speed)',
    typeCode: 'UTIL_TIME',
    inputs: [],
    outputs: [{ id: 'out', type: 'float' }],
  },
  {
    type: 'mixFinal',
    label: 'Mix',
    category: 'utilities',
    description: 'Mix dark color with u_color by factor',
    typeCode: 'UTIL_MIX',
    inputs: [{ id: 'mix', type: 'float' }],
    outputs: [{ id: 'out', type: 'vec3' }],
  },
  {
    type: 'fragmentOut',
    label: 'Fragment Out',
    category: 'utilities',
    description: 'Final output node — writes to gl_FragColor',
    typeCode: 'UTIL_OUT',
    inputs: [{ id: 'color', type: 'vec3' }],
    outputs: [],
  },
  {
    type: 'colorPicker',
    label: 'Farbwähler',
    category: 'constants',
    description: 'Pick a color constant (vec3)',
    typeCode: 'CONST_COLOR',
    inputs: [],
    outputs: [{ id: 'out', type: 'vec3' }],
    defaultData: { r: 1.0, g: 0.5, b: 0.2 },
  },

  // ── Math ──
  {
    type: 'wave',
    label: 'Wave',
    category: 'math',
    description: 'Sine wave oscillator: sin(uv + phase) × scale',
    typeCode: 'MATH_WAVE',
    inputs: [
      { id: 'uv', type: 'vec2', label: 'UV' },
      { id: 'phase', type: 'float', label: 'Phase' },
    ],
    outputs: [{ id: 'out', type: 'float' }],
  },
  {
    type: 'mulFloat',
    label: 'Multiply',
    category: 'math',
    description: 'Multiply two float values',
    typeCode: 'MATH_MUL',
    inputs: [
      { id: 'a', type: 'float' },
      { id: 'b', type: 'float' },
    ],
    outputs: [{ id: 'out', type: 'float' }],
  },
  {
    type: 'addFloat',
    label: 'Add',
    category: 'math',
    description: 'Add two float values',
    typeCode: 'MATH_ADD',
    inputs: [
      { id: 'a', type: 'float' },
      { id: 'b', type: 'float' },
    ],
    outputs: [{ id: 'out', type: 'float' }],
  },

  // ── Constants ──
  {
    type: 'floatConst',
    label: 'Konstante',
    category: 'constants',
    description: 'A constant float value',
    typeCode: 'CONST_F',
    inputs: [],
    outputs: [{ id: 'out', type: 'float' }],
    defaultData: { value: 0.5 },
  },
  {
    type: 'vec3Const',
    label: 'Vector3',
    category: 'constants',
    description: 'A constant vec3 value (x, y, z)',
    typeCode: 'CONST_V3',
    inputs: [],
    outputs: [{ id: 'out', type: 'vec3' }],
    defaultData: { x: 1.0, y: 0.0, z: 0.0 },
  },

  // ── Textures ──
  {
    type: 'noise',
    label: 'Simplex Noise',
    category: 'textures',
    description: '2D simplex noise pattern',
    typeCode: 'TEX_NOISE',
    inputs: [
      { id: 'uv', type: 'vec2', label: 'UV' },
      { id: 'scale', type: 'float', label: 'Scale' },
    ],
    outputs: [{ id: 'out', type: 'float' }],
    preamble: 'simplex2d',
  },
  {
    type: 'voronoi',
    label: 'Voronoi',
    category: 'textures',
    description: '2D voronoi cell distance pattern',
    typeCode: 'TEX_VOR',
    inputs: [
      { id: 'uv', type: 'vec2', label: 'UV' },
      { id: 'scale', type: 'float', label: 'Scale' },
    ],
    outputs: [{ id: 'out', type: 'float' }],
    preamble: 'voronoi2d',
  },
  {
    type: 'texture2D',
    label: '2D Texture',
    category: 'textures',
    description: 'Procedural checkerboard pattern (texture loading in Spec 2)',
    typeCode: 'TEX_2D',
    inputs: [
      { id: 'uv', type: 'vec2', label: 'UV' },
    ],
    outputs: [{ id: 'out', type: 'vec3' }],
    defaultData: { textureId: '' },
  },
]

export function getRegistryEntry(type: string): NodeRegistryEntry | undefined {
  return nodeRegistry.find((e) => e.type === type)
}

export function getByCategory(category: NodeCategory): NodeRegistryEntry[] {
  return nodeRegistry.filter((e) => e.category === category)
}

/** All categories in display order */
export const CATEGORIES: NodeCategory[] = ['math', 'textures', 'utilities', 'constants']
