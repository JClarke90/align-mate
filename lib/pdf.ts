import { jsPDF } from "jspdf"
import { cropLines, type GridLayout, type Settings, type Sheet } from "@/lib/proxy"

// Pull the image format out of a data URL so jsPDF gets the right codec.
function formatFromDataUrl(src: string): "PNG" | "JPEG" | "WEBP" {
  const match = /^data:image\/(png|jpe?g|webp)/i.exec(src)
  if (!match) return "PNG"
  const kind = match[1].toLowerCase()
  if (kind === "jpg" || kind === "jpeg") return "JPEG"
  if (kind === "webp") return "WEBP"
  return "PNG"
}

export type PdfResult = { blob: Blob; url: string; pageCount: number }

/**
 * Build a print-ready PDF at true physical size (mm) from the computed sheets.
 * Mirrors PrintSheet: same card positions and crop marks, just drawn into a PDF.
 */
export function buildPdf(sheets: Sheet[], settings: Settings, layout: GridLayout): PdfResult {
  const orientation = layout.pageWidth > layout.pageHeight ? "landscape" : "portrait"

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: [layout.pageWidth, layout.pageHeight],
    compress: true,
  })

  const marks = cropLines(settings, layout)
  const len = settings.cropMarkLength

  sheets.forEach((sheet, index) => {
    if (index > 0) doc.addPage([layout.pageWidth, layout.pageHeight], orientation)

    // Cards
    for (const slot of sheet.slots) {
      const src = sheet.side === "front" ? slot.frontSrc : slot.backSrc
      if (!src) continue
      try {
        doc.addImage(
          src,
          formatFromDataUrl(src),
          slot.x,
          slot.y,
          settings.cardWidth,
          settings.cardHeight,
          undefined,
          "FAST",
        )
      } catch {
        // Skip an image jsPDF can't decode rather than aborting the whole export.
      }
    }

    // Crop marks — thin black ticks at the extension of every cut line.
    if (settings.cropMarks) {
      doc.setDrawColor(17, 24, 39) // #111827
      doc.setLineWidth(0.2)

      for (const x of marks.xs) {
        const topTick = Math.min(len, marks.top)
        if (topTick > 0) doc.line(x, marks.top - topTick, x, marks.top)
        const bottomTick = Math.min(len, layout.pageHeight - marks.bottom)
        if (bottomTick > 0) doc.line(x, marks.bottom, x, marks.bottom + bottomTick)
      }
      for (const y of marks.ys) {
        const leftTick = Math.min(len, marks.left)
        if (leftTick > 0) doc.line(marks.left - leftTick, y, marks.left, y)
        const rightTick = Math.min(len, layout.pageWidth - marks.right)
        if (rightTick > 0) doc.line(marks.right, y, marks.right + rightTick, y)
      }
    }
  })

  const blob = doc.output("blob")
  const url = URL.createObjectURL(blob)
  return { blob, url, pageCount: sheets.length }
}
