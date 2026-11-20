/** Holds the user's uploaded video for the current tab session (never uploaded anywhere). */
let current: { url: string; name: string; size: number } | null = null

export function setUpload(file: File) {
  if (current) URL.revokeObjectURL(current.url)
  current = { url: URL.createObjectURL(file), name: file.name, size: file.size }
  return current
}

export function getUpload() {
  return current
}
