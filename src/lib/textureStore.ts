const DB_NAME = 'elastic-forge-textures'
const STORE_NAME = 'textures'
const DB_VERSION = 1

export type StoredTexture = {
  id: string
  name: string
  mimeType: string
  width: number
  height: number
  dataUrl: string
  createdAt: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveTexture(texture: StoredTexture): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(texture)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getTexture(id: string): Promise<StoredTexture | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve(req.result as StoredTexture | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllTextures(): Promise<StoredTexture[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as StoredTexture[])
    req.onerror = () => reject(req.error)
  })
}

export async function deleteTexture(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Read a File into a data URL and extract dimensions */
export function fileToTexture(file: File): Promise<StoredTexture> {
  return new Promise((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error('Datei zu groß (max. 4 MB).'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: file.type,
          width: img.width,
          height: img.height,
          dataUrl,
          createdAt: new Date().toISOString(),
        })
      }
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'))
      img.src = dataUrl
    }
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
    reader.readAsDataURL(file)
  })
}
