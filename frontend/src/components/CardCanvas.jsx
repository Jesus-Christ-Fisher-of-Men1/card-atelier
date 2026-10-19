import { useRef } from "react";
import { mediaUrl } from "@/lib/api";
import { SIZES, FRAMES, ShapeSvg, ClipartSvg } from "@/lib/cardKit";

function ElementBody({ el }) {
  if (el.type === "text")
    return (
      <div
        style={{
          fontFamily: `'${el.font}'`, fontSize: `${el.size}cqw`, color: el.color, textAlign: el.align,
          fontWeight: el.weight, fontStyle: el.italic ? "italic" : "normal", lineHeight: 1.15,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}
      >
        {el.text}
      </div>
    );
  if (el.type === "shape") return <ShapeSvg shape={el.shape} fill={el.fill} stroke={el.stroke} />;
  if (el.type === "clipart") return <ClipartSvg k={el.key} />;
  return (
    <img
      src={mediaUrl(el.src)} alt="" draggable={false}
      style={{ width: "100%", height: "100%", objectFit: el.fit || "contain", borderRadius: `${el.radius || 0}%`, display: "block" }}
    />
  );
}

function Frame({ frame }) {
  if (!frame || frame === "none") return null;
  if (frame.startsWith("/api/") || frame.startsWith("http"))
    return <img src={mediaUrl(frame)} alt="" className="absolute inset-0 w-full h-full object-fill pointer-events-none" style={{ zIndex: 900 }} />;
  const f = FRAMES.find((x) => x.id === frame);
  if (!f?.style) return null;
  return <div className="absolute pointer-events-none" style={{ ...f.style, zIndex: 900 }} />;
}

export const bgStyle = (bg) =>
  bg?.type === "image"
    ? { backgroundImage: `url("${mediaUrl(bg.value)}")`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: bg?.value || "#FFFFFF" };

export function CardCanvas({ design, editable = false, selectedId, onSelect, onChange, className = "", testId }) {
  const ref = useRef(null);
  const ratio = SIZES[design?.size]?.ratio || 5 / 7;

  const startDrag = (e, el, mode) => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(el.id);
    const rect = ref.current.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const o = { ...el };
    const move = (ev) => {
      const dx = ((ev.clientX - sx) / rect.width) * 100;
      const dy = ((ev.clientY - sy) / rect.height) * 100;
      if (mode === "move") onChange(el.id, { x: +(o.x + dx).toFixed(2), y: +(o.y + dy).toFixed(2) });
      else onChange(el.id, { w: Math.max(4, +(o.w + dx).toFixed(2)), ...(o.h != null ? { h: Math.max(3, +(o.h + dy).toFixed(2)) } : {}) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={ref}
      data-testid={testId}
      className={`relative overflow-hidden w-full select-none ${className}`}
      style={{ aspectRatio: ratio, containerType: "inline-size", ...bgStyle(design?.bg) }}
      onPointerDown={() => editable && onSelect?.(null)}
    >
      {(design?.elements || []).map((el, i) => {
        const selected = editable && el.id === selectedId;
        return (
          <div
            key={el.id}
            data-testid={editable ? `canvas-el-${el.type}-${i}` : undefined}
            onPointerDown={(e) => startDrag(e, el, "move")}
            className={editable ? `cursor-move ${selected ? "outline outline-2 outline-[#E05A47] outline-offset-2" : "hover:outline hover:outline-1 hover:outline-[#E05A47]/50"}` : ""}
            style={{
              position: "absolute", left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`,
              height: el.h != null ? `${el.h}%` : "auto", transform: `rotate(${el.rot || 0}deg)`,
              opacity: el.opacity ?? 1, zIndex: i + 1, touchAction: "none",
            }}
          >
            <ElementBody el={el} />
            {selected && (
              <span
                data-testid="canvas-resize-handle"
                onPointerDown={(e) => startDrag(e, el, "resize")}
                className="absolute -right-2 -bottom-2 w-4 h-4 rounded-full bg-[#E05A47] border-2 border-white cursor-nwse-resize shadow"
              />
            )}
          </div>
        );
      })}
      <Frame frame={design?.frame} />
    </div>
  );
}
