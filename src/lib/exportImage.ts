import * as THREE from 'three'
import { VERTEX_SHADER, validateFragmentShader } from '../shader/constants'
import type { UniformsState } from '../shader/uniforms'
import type { CompositeSnapshot } from '../shader/layerComposite'
import type { ShaderLayerMeta } from '../project/layers'

export type ExportFormat = 'png' | 'jpeg' | 'webp'

export type ExportOptions = {
  width: number
  height: number
  format: ExportFormat
  quality: number // 0.0–1.0 (ignored for PNG)
}

export const EXPORT_PRESETS: Array<{ label: string; w: number; h: number }> = [
  { label: '1920 × 1080 (Full HD)', w: 1920, h: 1080 },
  { label: '3840 × 2160 (4K)', w: 3840, h: 2160 },
  { label: '1080 × 1080 (Quadrat)', w: 1080, h: 1080 },
  { label: '1080 × 1920 (Story)', w: 1080, h: 1920 },
]

const BLEND_FS = `precision highp float;
uniform sampler2D u_base;
uniform sampler2D u_top;
uniform float u_opacity;
uniform int u_mode;
uniform vec2 u_resolution;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec3 b = texture2D(u_base, uv).rgb;
  vec3 t = texture2D(u_top, uv).rgb;
  float a = clamp(u_opacity, 0.0, 1.0);
  vec3 outc;
  if (u_mode == 1) { outc = b + t * a; }
  else if (u_mode == 2) { outc = mix(b, b * t, a); }
  else { outc = t * a + b * (1.0 - a); }
  gl_FragColor = vec4(clamp(outc, 0.0, 1.0), 1.0);
}
`

const BLIT_FS = `precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  gl_FragColor = vec4(texture2D(u_tex, uv).rgb, 1.0);
}
`

function blendModeToInt(mode: ShaderLayerMeta['blendMode']): number {
  if (mode === 'add') return 1
  if (mode === 'multiply') return 2
  return 0
}

function createRT(w: number, h: number) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  })
}

function mimeType(format: ExportFormat): string {
  if (format === 'jpeg') return 'image/jpeg'
  if (format === 'webp') return 'image/webp'
  return 'image/png'
}

function fileExtension(format: ExportFormat): string {
  return format === 'jpeg' ? 'jpg' : format
}

export function exportShaderImage(
  snapshot: CompositeSnapshot,
  uniforms: UniformsState,
  options: ExportOptions,
  projectName: string,
): boolean {
  const { width: w, height: h, format, quality } = options

  // Build visible layer stack
  const sorted = [...snapshot.metas].sort((a, b) => a.order - b.order)
  const stack = sorted
    .filter((m) => m.visible && snapshot.bundles[m.id])
    .map((m) => ({
      meta: m,
      fragment: snapshot.bundles[m.id]!.fragment,
    }))
    .filter((p) => {
      const v = validateFragmentShader(p.fragment)
      return v.ok
    })

  if (stack.length === 0) return false

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geom = new THREE.PlaneGeometry(2, 2)

  const rtBlack = createRT(w, h)
  const rtTemp = createRT(w, h)
  const rtA = createRT(w, h)
  const rtB = createRT(w, h)

  renderer.setRenderTarget(rtBlack)
  renderer.setClearColor(0x000000, 1)
  renderer.clear(true, true, true)
  renderer.setRenderTarget(null)

  const sharedUniforms = {
    u_time: { value: 1.25 },
    u_speed: { value: uniforms.u_speed },
    u_scale: { value: uniforms.u_scale },
    u_color: { value: new THREE.Vector3(...uniforms.u_color) },
    u_intensity: { value: uniforms.u_intensity },
    u_saturation: { value: uniforms.u_saturation },
    u_contrast: { value: uniforms.u_contrast },
    u_gamma: { value: uniforms.u_gamma },
    u_resolution: { value: new THREE.Vector2(w, h) },
  }

  const blendUniforms = {
    u_base: { value: rtBlack.texture },
    u_top: { value: rtTemp.texture },
    u_opacity: { value: 1 },
    u_mode: { value: 0 },
    u_resolution: { value: new THREE.Vector2(w, h) },
  }
  const blendMat = new THREE.ShaderMaterial({
    uniforms: blendUniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: BLEND_FS,
    toneMapped: false,
  })
  const blendScene = new THREE.Scene()
  blendScene.add(new THREE.Mesh(geom, blendMat))

  const layerScene = new THREE.Scene()
  const layerMesh = new THREE.Mesh(geom)
  layerScene.add(layerMesh)

  const layerMats = stack.map(
    (pass) =>
      new THREE.ShaderMaterial({
        uniforms: sharedUniforms,
        vertexShader: VERTEX_SHADER,
        fragmentShader: pass.fragment,
        toneMapped: false,
      }),
  )

  const cleanup = () => {
    for (const m of layerMats) m.dispose()
    blendMat.dispose()
    geom.dispose()
    rtBlack.dispose()
    rtTemp.dispose()
    rtA.dispose()
    rtB.dispose()
    renderer.dispose()
  }

  try {
    let curBase: THREE.WebGLRenderTarget = rtBlack
    for (let i = 0; i < stack.length; i++) {
      renderer.setRenderTarget(rtTemp)
      renderer.clear(true, true, true)
      layerMesh.material = layerMats[i]!
      renderer.render(layerScene, camera)

      const outRT = i % 2 === 0 ? rtA : rtB
      renderer.setRenderTarget(outRT)
      renderer.clear(true, true, true)
      blendUniforms.u_base.value = curBase.texture
      blendUniforms.u_top.value = rtTemp.texture
      blendUniforms.u_opacity.value = stack[i]!.meta.opacity
      blendUniforms.u_mode.value = blendModeToInt(stack[i]!.meta.blendMode)
      renderer.render(blendScene, camera)
      curBase = outRT
    }

    // Blit to screen
    const blitUniforms = {
      u_tex: { value: curBase.texture },
      u_resolution: { value: new THREE.Vector2(w, h) },
    }
    const blitMat = new THREE.ShaderMaterial({
      uniforms: blitUniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: BLIT_FS,
      toneMapped: true,
    })
    const blitScene = new THREE.Scene()
    blitScene.add(new THREE.Mesh(geom, blitMat))
    renderer.setRenderTarget(null)
    renderer.clear(true, true, true)
    renderer.render(blitScene, camera)
    blitMat.dispose()
  } catch {
    cleanup()
    return false
  }

  // Capture and download
  let dataUrl: string
  try {
    dataUrl = renderer.domElement.toDataURL(mimeType(format), format === 'png' ? undefined : quality)
  } catch {
    cleanup()
    return false
  }

  cleanup()

  if (!dataUrl || dataUrl.length < 32) return false

  // Trigger download
  const safeName = (projectName || 'shader').replace(/[^\w-]+/g, '_').slice(0, 64)
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${safeName}.${fileExtension(format)}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  return true
}
