// Core types + layout math for the proxy sheet generator.
// Everything is expressed in millimeters (mm) so it prints at true size.

export type PaperKey = "a4" | "letter"

export const PAPER_SIZES: Record<PaperKey, { label: string; width: number; height: number }> = {
  a4: { label: "A4 (210 × 297 mm)", width: 210, height: 297 },
  letter: { label: "US Letter (216 × 279 mm)", width: 215.9, height: 279.4 },
}

export type FlipEdge = "long" | "short"

export type CardImage = {
  id: string
  name: string
  src: string // data URL
  quantity: number
  backSrc?: string // optional per-card back (overrides shared back)
}

export type Settings = {
  cardWidth: number
  cardHeight: number
  gap: number // mm between cards
  paper: PaperKey
  cropMarks: boolean
  cropMarkLength: number // mm
  cardOutline: boolean // draw a border around each card
  cardOutlineWidth: number // mm
  duplex: boolean
  sharedBack: string | null // data URL for a back used by all cards
  backOffsetX: number // mm, fine-tune back alignment
  backOffsetY: number // mm
  flipEdge: FlipEdge
}

export const DEFAULT_SETTINGS: Settings = {
  cardWidth: 57,
  cardHeight: 87,
  gap: 0,
  paper: "a4",
  cropMarks: true,
  cropMarkLength: 3,
  cardOutline: false,
  cardOutlineWidth: 1,
  duplex: true,
  sharedBack: null,
  backOffsetX: 0,
  backOffsetY: 0,
  flipEdge: "long",
}

export type GridLayout = {
  cols: number
  rows: number
  perPage: number
  blockWidth: number
  blockHeight: number
  offsetX: number // left offset to center the block on the page (mm)
  offsetY: number
  pageWidth: number
  pageHeight: number
}

// How many cards fit, centered on the page.
export function computeLayout(s: Settings): GridLayout {
  const paper = PAPER_SIZES[s.paper]
  const { width: pageWidth, height: pageHeight } = paper

  // Small hard margin the vast majority of consumer printers cannot print into.
  const printableMargin = 4 // mm on each edge
  const usableW = pageWidth - printableMargin * 2
  const usableH = pageHeight - printableMargin * 2

  const cols = Math.max(0, Math.floor((usableW + s.gap) / (s.cardWidth + s.gap)))
  const rows = Math.max(0, Math.floor((usableH + s.gap) / (s.cardHeight + s.gap)))

  const blockWidth = cols > 0 ? cols * s.cardWidth + (cols - 1) * s.gap : 0
  const blockHeight = rows > 0 ? rows * s.cardHeight + (rows - 1) * s.gap : 0

  const offsetX = (pageWidth - blockWidth) / 2
  const offsetY = (pageHeight - blockHeight) / 2

  return {
    cols,
    rows,
    perPage: cols * rows,
    blockWidth,
    blockHeight,
    offsetX,
    offsetY,
    pageWidth,
    pageHeight,
  }
}

// A single card slot on a page.
export type Slot = {
  key: string
  row: number
  col: number
  x: number // mm from page left
  y: number // mm from page top
  frontSrc: string | null
  backSrc: string | null
}

export type Sheet = {
  id: string
  side: "front" | "back"
  slots: Slot[]
}

// Expand the card list by quantity into a flat array of front/back pairs.
export function expandCards(cards: CardImage[], sharedBack: string | null) {
  const flat: { frontSrc: string; backSrc: string | null }[] = []
  for (const c of cards) {
    const qty = Math.max(0, Math.floor(c.quantity || 0))
    for (let i = 0; i < qty; i++) {
      flat.push({ frontSrc: c.src, backSrc: c.backSrc ?? sharedBack })
    }
  }
  return flat
}

// Build the ordered list of sheets to print (fronts, and mirrored backs if duplex).
export function buildSheets(cards: CardImage[], s: Settings, layout: GridLayout): Sheet[] {
  if (layout.perPage <= 0) return []
  const flat = expandCards(cards, s.sharedBack)
  if (flat.length === 0) return []

  const pages = Math.ceil(flat.length / layout.perPage)
  const sheets: Sheet[] = []

  const slotPosition = (row: number, col: number) => ({
    x: layout.offsetX + col * (s.cardWidth + s.gap),
    y: layout.offsetY + row * (s.cardHeight + s.gap),
  })

  for (let p = 0; p < pages; p++) {
    const pageCards = flat.slice(p * layout.perPage, (p + 1) * layout.perPage)

    // Front sheet
    const frontSlots: Slot[] = []
    for (let i = 0; i < pageCards.length; i++) {
      const row = Math.floor(i / layout.cols)
      const col = i % layout.cols
      const pos = slotPosition(row, col)
      frontSlots.push({
        key: `f-${p}-${i}`,
        row,
        col,
        x: pos.x,
        y: pos.y,
        frontSrc: pageCards[i].frontSrc,
        backSrc: null,
      })
    }
    sheets.push({ id: `front-${p}`, side: "front", slots: frontSlots })

    if (s.duplex) {
      // Back sheet: mirror so cards line up after flipping the paper.
      const backSlots: Slot[] = []
      for (let i = 0; i < pageCards.length; i++) {
        const row = Math.floor(i / layout.cols)
        const col = i % layout.cols
        // Long-edge flip mirrors columns; short-edge flip mirrors rows.
        const mRow = s.flipEdge === "short" ? layout.rows - 1 - row : row
        const mCol = s.flipEdge === "long" ? layout.cols - 1 - col : col
        const pos = slotPosition(mRow, mCol)
        backSlots.push({
          key: `b-${p}-${i}`,
          row: mRow,
          col: mCol,
          x: pos.x + s.backOffsetX,
          y: pos.y + s.backOffsetY,
          frontSrc: null,
          backSrc: pageCards[i].backSrc,
        })
      }
      sheets.push({ id: `back-${p}`, side: "back", slots: backSlots })
    }
  }

  return sheets
}

// Unique cut-line positions (edges of every card) for crop marks.
export function cropLines(s: Settings, layout: GridLayout) {
  const xs = new Set<number>()
  const ys = new Set<number>()
  for (let c = 0; c < layout.cols; c++) {
    const left = layout.offsetX + c * (s.cardWidth + s.gap)
    xs.add(round(left))
    xs.add(round(left + s.cardWidth))
  }
  for (let r = 0; r < layout.rows; r++) {
    const top = layout.offsetY + r * (s.cardHeight + s.gap)
    ys.add(round(top))
    ys.add(round(top + s.cardHeight))
  }
  return {
    xs: Array.from(xs).sort((a, b) => a - b),
    ys: Array.from(ys).sort((a, b) => a - b),
    top: layout.offsetY,
    bottom: layout.offsetY + layout.blockHeight,
    left: layout.offsetX,
    right: layout.offsetX + layout.blockWidth,
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
