import { useEffect, useState } from 'react'
import { captureShaderThumbnail } from '../shader/captureShaderThumbnail'
import { validateFragmentShader } from '../shader/constants'
import type { UniformsState } from '../shader/uniforms'

export default function ShaderThumbnail({
  fragment,
  uniforms,
  className = '',
}: {
  fragment: string
  uniforms: UniformsState
  className?: string
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const check = validateFragmentShader(fragment)
    if (!check.ok) {
      setError(true)
      setDataUrl(null)
      return
    }
    setError(false)
    const url = captureShaderThumbnail(fragment, uniforms, { w: 320, h: 180 })
    setDataUrl(url)
  }, [
    fragment,
    uniforms.u_scale,
    uniforms.u_speed,
    uniforms.u_color,
    uniforms.u_intensity,
    uniforms.u_saturation,
    uniforms.u_contrast,
    uniforms.u_gamma,
  ])

  if (error) {
    return (
      <div className={`shader-thumb-host ${className}`.trim()}>
        <div className="shader-thumb shader-thumb--error" title="Shader-Fehler" />
      </div>
    )
  }

  return (
    <div className={`shader-thumb-host ${className}`.trim()}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }}
        />
      ) : (
        <div className="shader-thumb shader-thumb--loading" />
      )}
    </div>
  )
}
