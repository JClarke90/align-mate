"use client"

import { useRef, useState } from "react"
import { Upload, Trash2, Minus, Plus, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type CardImage, readFileAsDataURL } from "@/lib/proxy"

type Props = {
  cards: CardImage[]
  onChange: (cards: CardImage[]) => void
  duplex: boolean
  sharedBack: string | null
  onSharedBackChange: (src: string | null) => void
}

let idCounter = 0
const nextId = () => `card-${Date.now()}-${idCounter++}`

export function CardList({ cards, onChange, duplex, sharedBack, onSharedBackChange }: Props) {
  const frontInput = useRef<HTMLInputElement>(null)
  const backInput = useRef<HTMLInputElement>(null)
  const perCardBackInput = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [perCardTarget, setPerCardTarget] = useState<string | null>(null)

  const addFiles = async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"))
    const added: CardImage[] = []
    for (const f of imgs) {
      const src = await readFileAsDataURL(f)
      added.push({ id: nextId(), name: f.name, src, quantity: 1 })
    }
    if (added.length) onChange([...cards, ...added])
  }

  const setQty = (id: string, qty: number) => {
    onChange(cards.map((c) => (c.id === id ? { ...c, quantity: Math.max(0, qty) } : c)))
  }

  const remove = (id: string) => onChange(cards.filter((c) => c.id !== id))

  const totalCards = cards.reduce((sum, c) => sum + Math.max(0, Math.floor(c.quantity || 0)), 0)

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
        }}
        onClick={() => frontInput.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/50"
        }`}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-5" />
        </div>
        <div className="text-sm font-medium">Drop card fronts here</div>
        <div className="text-xs text-muted-foreground">or click to browse — PNG, JPG, WEBP</div>
        <input
          ref={frontInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {/* Shared back */}
      {duplex && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            {sharedBack ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sharedBack || "/placeholder.svg"} alt="Card back" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Shared card back</div>
            <p className="text-xs text-muted-foreground">Used for every card without its own back</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => backInput.current?.click()}>
              {sharedBack ? "Replace" : "Upload"}
            </Button>
            {sharedBack && (
              <Button variant="ghost" size="icon" onClick={() => onSharedBackChange(null)} aria-label="Remove shared back">
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
          <input
            ref={backInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) onSharedBackChange(await readFileAsDataURL(f))
              e.target.value = ""
            }}
          />
        </div>
      )}

      {/* Card rows */}
      {cards.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {cards.length} image{cards.length === 1 ? "" : "s"} · {totalCards} card{totalCards === 1 ? "" : "s"} total
            </span>
            <button type="button" onClick={() => onChange([])} className="text-destructive hover:underline">
              Clear all
            </button>
          </div>

          <ul className="space-y-2">
            {cards.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2">
                <div className="size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.src || "/placeholder.svg"} alt={c.name} className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  {duplex && (
                    <button
                      type="button"
                      onClick={() => {
                        setPerCardTarget(c.id)
                        perCardBackInput.current?.click()
                      }}
                      className="mt-0.5 text-xs text-primary hover:underline"
                    >
                      {c.backSrc ? "Custom back ✓ — change" : "Set custom back"}
                    </button>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1 rounded-md border border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setQty(c.id, c.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <input
                    type="number"
                    min={0}
                    value={c.quantity}
                    onChange={(e) => setQty(c.id, Number.parseInt(e.target.value || "0", 10))}
                    className="w-10 bg-transparent text-center text-sm font-mono outline-none"
                    aria-label="Quantity"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setQty(c.id, c.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>

                <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Remove card">
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>

          <input
            ref={perCardBackInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f && perCardTarget) {
                const src = await readFileAsDataURL(f)
                onChange(cards.map((c) => (c.id === perCardTarget ? { ...c, backSrc: src } : c)))
              }
              setPerCardTarget(null)
              e.target.value = ""
            }}
          />
        </div>
      )}
    </div>
  )
}
