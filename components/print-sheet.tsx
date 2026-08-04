"use client"

import { cropLines, type GridLayout, type Settings, type Sheet } from "@/lib/proxy"

type Props = {
  sheet: Sheet
  settings: Settings
  layout: GridLayout
  /** When true, render at true mm size for printing. When false, scale down for preview. */
  print?: boolean
}

const mm = (v: number) => `${v}mm`

export function PrintSheet({ sheet, settings, layout, print = false }: Props) {
  const marks = cropLines(settings, layout)
  const len = settings.cropMarkLength

  return (
    <div
      className="print-sheet relative overflow-hidden"
      style={{
        width: mm(layout.pageWidth),
        // In print, keep the box a hair under the true page height. A box
        // exactly equal to the page height rounds up by a sub-pixel and spills
        // onto a blank following page (doubling the page count). Cards and crop
        // marks are absolutely positioned from the top, so they don't shift.
        height: mm(print ? layout.pageHeight - 0.5 : layout.pageHeight),
        background: "#ffffff",
        // subtle preview-only chrome; removed in print via CSS
        boxShadow: print ? "none" : "0 1px 3px rgba(0,0,0,0.25)",
      }}
      aria-label={`${sheet.side} sheet`}
    >
      {/* Cards */}
      {sheet.slots.map((slot) => {
        const src = sheet.side === "front" ? slot.frontSrc : slot.backSrc
        return (
          <div
            key={slot.key}
            style={{
              position: "absolute",
              left: mm(slot.x),
              top: mm(slot.y),
              width: mm(settings.cardWidth),
              height: mm(settings.cardHeight),
              overflow: "hidden",
              background: src ? "transparent" : "#e5e7eb",
              border: src ? "none" : "0.2mm dashed #9ca3af",
              boxSizing: "border-box",
            }}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src || "/placeholder.svg"}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "fill", // fill exact card box -> no distortion beyond the box we control
                  display: "block",
                }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  fontSize: "3mm",
                }}
              >
                {sheet.side === "back" ? "No back" : "Empty"}
              </div>
            )}
          </div>
        )
      })}

      {/* Crop marks (corner ticks at the extension of every cut line) */}
      {settings.cropMarks && (
        <>
          {/* Vertical cut lines -> ticks above top edge and below bottom edge */}
          {marks.xs.map((x, i) => (
            <div key={`vx-${i}`}>
              <div
                style={{
                  position: "absolute",
                  left: mm(x),
                  top: mm(Math.max(0, marks.top - len)),
                  width: "0.2mm",
                  height: mm(Math.min(len, marks.top)),
                  background: "#111827",
                  transform: "translateX(-0.1mm)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: mm(x),
                  top: mm(marks.bottom),
                  width: "0.2mm",
                  height: mm(Math.min(len, layout.pageHeight - marks.bottom)),
                  background: "#111827",
                  transform: "translateX(-0.1mm)",
                }}
              />
            </div>
          ))}
          {/* Horizontal cut lines -> ticks left of left edge and right of right edge */}
          {marks.ys.map((y, i) => (
            <div key={`hy-${i}`}>
              <div
                style={{
                  position: "absolute",
                  top: mm(y),
                  left: mm(Math.max(0, marks.left - len)),
                  height: "0.2mm",
                  width: mm(Math.min(len, marks.left)),
                  background: "#111827",
                  transform: "translateY(-0.1mm)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: mm(y),
                  left: mm(marks.right),
                  height: "0.2mm",
                  width: mm(Math.min(len, layout.pageWidth - marks.right)),
                  background: "#111827",
                  transform: "translateY(-0.1mm)",
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
