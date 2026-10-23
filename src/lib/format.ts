export function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatMsPrecise(ms: number): string {
  const totalSec = Math.max(0, ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = (totalSec % 60).toFixed(1).padStart(4, '0')
  return `${m}:${s}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
