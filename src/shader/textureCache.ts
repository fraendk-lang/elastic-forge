import * as THREE from 'three'
import { getTexture } from '../lib/textureStore'
import type { TextureBinding } from '../graph/glslCodegen'

const cache = new Map<string, THREE.Texture>()

/** Load a texture from IndexedDB into a THREE.Texture (cached). */
export async function loadTexture(textureId: string): Promise<THREE.Texture | null> {
  if (cache.has(textureId)) return cache.get(textureId)!

  const stored = await getTexture(textureId)
  if (!stored) return null

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const tex = new THREE.Texture(img)
      tex.needsUpdate = true
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      cache.set(textureId, tex)
      resolve(tex)
    }
    img.onerror = () => resolve(null)
    img.src = stored.dataUrl
  })
}

/** Get a texture from cache synchronously (returns null if not yet loaded). */
export function getTextureFromCache(textureId: string): THREE.Texture | null {
  return cache.get(textureId) ?? null
}

/** Preload all textures referenced by bindings. */
export async function preloadTextureBindings(bindings: TextureBinding[]): Promise<void> {
  await Promise.all(bindings.map((b) => loadTexture(b.textureId)))
}

/** Clear a specific texture from cache. */
export function invalidateTexture(textureId: string): void {
  const tex = cache.get(textureId)
  if (tex) {
    tex.dispose()
    cache.delete(textureId)
  }
}
