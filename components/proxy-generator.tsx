"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Printer, Layers, FileWarning } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsPanel } from "@/components/settings-panel"
import { CardList } from "@/components/card-list"
import { PrintSheet } from "@/components/print-sheet"
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

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
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
        <Button size="lg" onClick={() => window.print()} disabled={!canPrint} className="shrink-0 gap-2">
          <Printer className="size-4" />
          Print / Save PDF
        </Button>
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

      {/* Hidden true-size render used only for printing. */}
      <div className="print-root pointer-events-none fixed -left-[99999px] top-0" aria-hidden="true">
        {sheets.map((sheet) => (
          <PrintSheet key={sheet.id} sheet={sheet} settings={settings} layout={layout} print />
        ))}
      </div>
    </div>
  )
}
