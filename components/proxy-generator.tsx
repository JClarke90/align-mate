"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { FileDown, FileCode, Printer, Layers, FileWarning, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsPanel } from "@/components/settings-panel"
import { CardList } from "@/components/card-list"
import { PrintSheet } from "@/components/print-sheet"
import { buildPdf } from "@/lib/pdf"
import { buildSvgSheets } from "@/lib/svg"
import {
  buildSheets,
  computeLayout,
  DEFAULT_SETTINGS,
  PAPER_SIZES,
  type CardImage,
  type Settings,
} from "@/lib/proxy"

const PX_PER_MM = 96 / 25.4 // CSS reference: 96px per inch

export function ProxyGenerator() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [cards, setCards] = useState<CardImage[]>([])

  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }))

  const layout = useMemo(() => computeLayout(settings), [settings])
  const sheets = useMemo(() => buildSheets(cards, settings, layout), [cards, settings, layout])

  // Keep the @page size in sync with the chosen paper.
  useEffect(() => {
    document.documentElement.style.setProperty("--print-page-size", settings.paper === "letter" ? "letter" : "A4")
  }, [settings.paper])

  // Scale the preview to fit its container width.
  const previewRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = previewRef.current
    if (!el) return
    const pageWidthPx = layout.pageWidth * PX_PER_MM
    const update = () => {
      const available = el.clientWidth - 32
      setScale(Math.min(1, available / pageWidthPx))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [layout.pageWidth])

  const totalCards = cards.reduce((sum, c) => sum + Math.max(0, Math.floor(c.quantity || 0)), 0)
  const canPrint = sheets.length > 0 && layout.perPage > 0

  const [exporting, setExporting] = useState(false)

  const handleExportPdf = () => {
    if (!canPrint || exporting) return
    setExporting(true)
    try {
      // Build synchronously and trigger the download in the SAME tick as the
      // click. Any await / setTimeout before this point severs the browser's
      // transient user activation, which silently blocks the download.
      const { url } = buildPdf(sheets, settings, layout)

      // In the v0 preview the app runs inside an iframe, where opening a
      // blob-URL tab is blocked — download in place. When top-level, open in a
      // new tab like a normal PDF export.
      const inIframe = window.self !== window.top
      if (inIframe || !window.open(url, "_blank", "noopener,noreferrer")) {
        const a = document.createElement("a")
        a.href = url
        a.download = `proxy-sheet-${settings.cardWidth}x${settings.cardHeight}mm.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
      }

      // Release the object URL after the browser has had time to consume it.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      console.log("[v0] PDF export failed:", err)
    } finally {
      setExporting(false)
    }
  }

  const [exportingSvg, setExportingSvg] = useState(false)

  const handleExportSvg = () => {
    if (!canPrint || exportingSvg) return
    setExportingSvg(true)
    try {
      // One SVG per sheet (SVG has no multi-page concept). Front, plus a
      // mirrored back when duplex is on. Build and trigger downloads
      // synchronously so the click's user activation still covers them.
      const svgSheets = buildSvgSheets(sheets, settings, layout)

      svgSheets.forEach((s) => {
        const a = document.createElement("a")
        a.href = s.url
        a.download = s.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(s.url), 60_000)
      })
    } catch (err) {
      console.log("[v0] SVG export failed:", err)
    } finally {
      setExportingSvg(false)
    }
  }

  return (
    <div className="print-container mx-auto max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
      {/* On-screen UI. Hidden entirely (display:none) when printing so it
          contributes no pages. */}
      <div className="screen-only">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-primary">
            <Layers className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Proxy Sheet Generator</span>
          </div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight lg:text-3xl">
            Print cards at true size
          </h1>
          <p className="mt-1 max-w-xl text-pretty text-sm text-muted-foreground">
            Set your exact card dimensions and lay them out on {PAPER_SIZES[settings.paper].label} with crop marks and
            double-sided alignment. No stretching, no resizing.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="lg"
            variant="outline"
            onClick={() => window.print()}
            disabled={!canPrint}
            className="gap-2"
          >
            <Printer className="size-4" />
            Print
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleExportSvg}
            disabled={!canPrint || exportingSvg}
            className="gap-2"
          >
            {exportingSvg ? <Loader2 className="size-4 animate-spin" /> : <FileCode className="size-4" />}
            {exportingSvg ? "Generating…" : "Export SVG"}
          </Button>
          <Button size="lg" onClick={handleExportPdf} disabled={!canPrint || exporting} className="gap-2">
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            {exporting ? "Generating…" : "Export PDF"}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Controls */}
        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold">Cards</h2>
            <CardList
              cards={cards}
              onChange={setCards}
              duplex={settings.duplex}
              sharedBack={settings.sharedBack}
              onSharedBackChange={(src) => patch({ sharedBack: src })}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold">Layout</h2>
            <SettingsPanel
              settings={settings}
              onChange={patch}
              perPage={layout.perPage}
              cols={layout.cols}
              rows={layout.rows}
            />
          </div>
        </aside>

        {/* Preview */}
        <section ref={previewRef} className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {canPrint ? (
                <>
                  <span className="font-medium text-foreground">{sheets.length}</span> sheet
                  {sheets.length === 1 ? "" : "s"} · {totalCards} card{totalCards === 1 ? "" : "s"}
                  {settings.duplex ? " · double-sided" : ""}
                </>
              ) : (
                "Preview"
              )}
            </div>
            <div className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              {settings.cardWidth} × {settings.cardHeight} mm
            </div>
          </div>

          {!canPrint ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileWarning className="size-6" />
              </div>
              <div className="text-sm font-medium">
                {layout.perPage === 0 ? "Cards don't fit on this paper" : "Add cards to see a preview"}
              </div>
              <p className="max-w-xs text-xs text-muted-foreground">
                {layout.perPage === 0
                  ? "Reduce the card size or gap, or choose a larger paper size."
                  : "Upload one or more card fronts on the left to build your print sheet."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-muted/40 p-4">
              {sheets.map((sheet) => (
                <div
                  key={sheet.id}
                  style={{
                    width: layout.pageWidth * PX_PER_MM * scale,
                    height: layout.pageHeight * PX_PER_MM * scale,
                  }}
                  className="relative"
                >
                  <div
                    className="absolute left-0 top-0 origin-top-left"
                    style={{ transform: `scale(${scale})` }}
                  >
                    <div className="relative">
                      <span className="absolute -top-6 left-0 text-xs font-medium capitalize text-muted-foreground">
                        {sheet.side} {sheet.side === "back" ? "(mirrored)" : ""}
                      </span>
                      <PrintSheet sheet={sheet} settings={settings} layout={layout} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      </div>

      {/* True-size render used only for printing. Hidden on screen via CSS,
          shown (display:block) only inside @media print. */}
      <div className="print-root" aria-hidden="true">
        {sheets.map((sheet) => (
          <PrintSheet key={sheet.id} sheet={sheet} settings={settings} layout={layout} print />
        ))}
      </div>
    </div>
  )
}
