import { cropLines, type GridLayout, type Settings, type Sheet } from "@/lib/proxy"

export type SvgSheet = { name: string; svg: string; url: string }

// Escape a data URL for safe embedding inside an XML attribute.
function xmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function round(n: number) {
  return Math.round(n * 1000) / 1000
}

/**
 * Build one SVG per sheet at true physical size. The SVG declares its size in
 * millimeters with a viewBox of "0 0 pageWidth pageHeight", so 1 user unit = 1mm
 * and it opens/prints at exact A4 (or Letter) dimensions in any vector tool.
 * Mirrors PrintSheet/buildPdf: same card positions, same crop marks.
 */
export function buildSvgSheets(sheets: Sheet[], settings: Settings, layout: GridLayout): SvgSheet[] {
  const marks = cropLines(settings, layout)
  const len = settings.cropMarkLength
  const W = layout.pageWidth
  const H = layout.pageHeight

  return sheets.map((sheet, index) => {
    const parts: string[] = []

    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
        `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">`,
    )
    // White page background.
    parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`)

    // Cards
    for (const slot of sheet.slots) {
      const src = sheet.side === "front" ? slot.frontSrc : slot.backSrc
      if (!src) continue
      parts.push(
        `<image x="${round(slot.x)}" y="${round(slot.y)}" ` +
          `width="${round(settings.cardWidth)}" height="${round(settings.cardHeight)}" ` +
          `preserveAspectRatio="none" xlink:href="${xmlAttr(src)}"/>`,
      )
    }

    // Card outlines — stroke centered on each card boundary (SVG strokes are
    // centered on the path), so the card keeps its true size.
    if (settings.cardOutline) {
      const rects = sheet.slots
        .map(
          (slot) =>
            `<rect x="${round(slot.x)}" y="${round(slot.y)}" ` +
            `width="${round(settings.cardWidth)}" height="${round(settings.cardHeight)}" ` +
            `fill="none" stroke="#111827" stroke-width="${round(settings.cardOutlineWidth)}"/>`,
        )
        .join("")
      parts.push(`<g>${rects}</g>`)
    }

    // Crop marks — thin black ticks at the extension of every cut line.
    if (settings.cropMarks) {
      const lines: string[] = []
      const stroke = `stroke="#111827" stroke-width="0.2"`
      for (const x of marks.xs) {
        const topTick = Math.min(len, marks.top)
        if (topTick > 0) lines.push(`<line x1="${x}" y1="${round(marks.top - topTick)}" x2="${x}" y2="${round(marks.top)}" ${stroke}/>`)
        const bottomTick = Math.min(len, H - marks.bottom)
        if (bottomTick > 0) lines.push(`<line x1="${x}" y1="${round(marks.bottom)}" x2="${x}" y2="${round(marks.bottom + bottomTick)}" ${stroke}/>`)
      }
      for (const y of marks.ys) {
        const leftTick = Math.min(len, marks.left)
        if (leftTick > 0) lines.push(`<line x1="${round(marks.left - leftTick)}" y1="${y}" x2="${round(marks.left)}" y2="${y}" ${stroke}/>`)
        const rightTick = Math.min(len, W - marks.right)
        if (rightTick > 0) lines.push(`<line x1="${round(marks.right)}" y1="${y}" x2="${round(marks.right + rightTick)}" y2="${y}" ${stroke}/>`)
      }
      parts.push(`<g>${lines.join("")}</g>`)
    }

    parts.push(`</svg>`)

    const svg = parts.join("")
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const name = `proxy-${sheet.side}-${index + 1}-${settings.cardWidth}x${settings.cardHeight}mm.svg`
    return { name, svg, url }
  })
}
