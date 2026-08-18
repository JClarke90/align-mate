"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { PAPER_SIZES, type PaperKey, type Settings, type FlipEdge } from "@/lib/proxy"

type Props = {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  perPage: number
  cols: number
  rows: number
}

function NumberField({
  id,
  label,
  value,
  onChange,
  step = 1,
  min,
  suffix,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  suffix?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number.parseFloat(e.target.value))}
          className="font-mono"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function SettingsPanel({ settings, onChange, perPage, cols, rows }: Props) {
  return (
    <div className="space-y-6">
      {/* Card size */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Card size</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="cardWidth"
            label="Width"
            value={settings.cardWidth}
            step={0.5}
            min={1}
            suffix="mm"
            onChange={(v) => onChange({ cardWidth: v })}
          />
          <NumberField
            id="cardHeight"
            label="Height"
            value={settings.cardHeight}
            step={0.5}
            min={1}
            suffix="mm"
            onChange={(v) => onChange({ cardHeight: v })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <PresetChip label="57 × 87" active={settings.cardWidth === 57 && settings.cardHeight === 87} onClick={() => onChange({ cardWidth: 57, cardHeight: 87 })} />
          <PresetChip label="63 × 88 (MTG)" active={settings.cardWidth === 63 && settings.cardHeight === 88} onClick={() => onChange({ cardWidth: 63, cardHeight: 88 })} />
          <PresetChip label="59 × 86 (Yu-Gi-Oh)" active={settings.cardWidth === 59 && settings.cardHeight === 86} onClick={() => onChange({ cardWidth: 59, cardHeight: 86 })} />
        </div>
      </section>

      <Separator />

      {/* Sheet */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Sheet</h3>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Paper size</Label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PAPER_SIZES) as PaperKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ paper: key })}
                className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                  settings.paper === key
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                <span className="block font-medium text-foreground">{key === "a4" ? "A4" : "US Letter"}</span>
                <span className="text-[10px]">{PAPER_SIZES[key].label.replace(/^[^(]+/, "").replace(/[()]/g, "")}</span>
              </button>
            ))}
          </div>
        </div>
        <NumberField
          id="gap"
          label="Gap between cards"
          value={settings.gap}
          step={0.5}
          min={0}
          suffix="mm"
          onChange={(v) => onChange({ gap: v })}
        />
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Fits <span className="font-mono font-semibold text-foreground">{perPage}</span> cards per sheet
          {perPage > 0 ? (
            <span className="text-muted-foreground">
              {" "}
              ({cols} × {rows})
            </span>
          ) : (
            <span className="text-destructive"> — card too big for this paper</span>
          )}
        </p>
      </section>

      <Separator />

      {/* Crop marks */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Corner crop marks</h3>
            <p className="text-xs text-muted-foreground">Cut guides at every card edge</p>
          </div>
          <Switch checked={settings.cropMarks} onCheckedChange={(v) => onChange({ cropMarks: v })} />
        </div>
        {settings.cropMarks && (
          <NumberField
            id="cropLen"
            label="Mark length"
            value={settings.cropMarkLength}
            step={0.5}
            min={1}
            suffix="mm"
            onChange={(v) => onChange({ cropMarkLength: v })}
          />
        )}
      </section>

      <Separator />

      {/* Card outline */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Card outline</h3>
            <p className="text-xs text-muted-foreground">Border around every card front &amp; back</p>
          </div>
          <Switch checked={settings.cardOutline} onCheckedChange={(v) => onChange({ cardOutline: v })} />
        </div>
        {settings.cardOutline && (
          <NumberField
            id="outlineWidth"
            label="Outline width"
            value={settings.cardOutlineWidth}
            step={0.1}
            min={0.1}
            suffix="mm"
            onChange={(v) => onChange({ cardOutlineWidth: v })}
          />
        )}
      </section>

      <Separator />

      {/* Duplex */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Double-sided</h3>
            <p className="text-xs text-muted-foreground">Generate aligned back sheets</p>
          </div>
          <Switch checked={settings.duplex} onCheckedChange={(v) => onChange({ duplex: v })} />
        </div>

        {settings.duplex && (
          <div className="space-y-3 rounded-md border border-border bg-card p-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Flip edge</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["long", "short"] as FlipEdge[]).map((edge) => (
                  <button
                    key={edge}
                    type="button"
                    onClick={() => onChange({ flipEdge: edge })}
                    className={`rounded-md border px-3 py-2 text-xs capitalize transition-colors ${
                      settings.flipEdge === edge
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {edge} edge
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Match your printer&apos;s duplex setting. &quot;Long edge&quot; is the most common.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                id="offX"
                label="Back offset X"
                value={settings.backOffsetX}
                step={0.1}
                suffix="mm"
                onChange={(v) => onChange({ backOffsetX: v })}
              />
              <NumberField
                id="offY"
                label="Back offset Y"
                value={settings.backOffsetY}
                step={0.1}
                suffix="mm"
                onChange={(v) => onChange({ backOffsetY: v })}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Print a test page, measure how far the backs are off, then nudge these to compensate.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function PresetChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  )
}
