export const uid = () => Math.random().toString(36).slice(2, 10);

export const SIZES = {
  portrait: { label: "Portrait 5x7", ratio: 5 / 7 },
  square: { label: "Square", ratio: 1 },
  landscape: { label: "Landscape 7x5", ratio: 7 / 5 },
};

export const FONTS = [
  "Playfair Display", "Great Vibes", "Pacifico", "Dancing Script", "Lobster", "Abril Fatface", "Caveat",
  "Cormorant Garamond", "Outfit", "Bebas Neue", "Amatic SC", "Satisfy", "Josefin Sans", "Fraunces",
];

export const PALETTE = [
  "#121113", "#FFFFFF", "#FAF7F2", "#F4EFE6", "#E05A47", "#C84B39", "#E8A598", "#F7C9C0",
  "#D4AF37", "#F6E7B0", "#3A5A40", "#6B8F71", "#A3B18A", "#1F3B57", "#5B8DB8", "#B8D8E8",
  "#6D4C7D", "#C9A7D8", "#F28C28", "#FFD166",
];

export const GRADIENTS = [
  "linear-gradient(160deg,#E05A47 0%,#D4AF37 100%)",
  "linear-gradient(135deg,#FDF6F0 0%,#E8A598 100%)",
  "linear-gradient(135deg,#FAF7F2 0%,#F3ECE1 100%)",
  "linear-gradient(135deg,#121113 0%,#2A242E 100%)",
  "linear-gradient(180deg,#B8D8E8 0%,#FAF7F2 100%)",
  "linear-gradient(135deg,#3A5A40 0%,#A3B18A 100%)",
  "linear-gradient(135deg,#6D4C7D 0%,#E8A598 100%)",
  "radial-gradient(circle at 30% 20%,#FFD166 0%,#F28C28 60%,#C84B39 100%)",
];

export const OCCASIONS = ["Birthday", "Love", "Thank You", "Congratulations", "Holiday", "Wedding", "Get Well", "Sympathy", "General"];

export const FRAMES = [
  { id: "none", name: "None", style: null },
  { id: "classic", name: "Classic", style: { inset: "4%", border: "0.5cqw solid #D4AF37" } },
  { id: "gold", name: "Gold Leaf", style: { inset: "3%", border: "1cqw solid #D4AF37", boxShadow: "inset 0 0 0 0.5cqw #F6E7B0" } },
  { id: "double", name: "Double", style: { inset: "4%", border: "1.2cqw double #D4AF37" } },
  { id: "dashed", name: "Stitched", style: { inset: "4%", border: "0.6cqw dashed #E05A47", borderRadius: "3cqw" } },
  { id: "polaroid", name: "Polaroid", style: { inset: 0, border: "4cqw solid #FFFFFF", borderBottomWidth: "11cqw" } },
  { id: "floral", name: "Petal", style: { inset: "3%", border: "1.4cqw double #E8A598", borderRadius: "9cqw" } },
  { id: "noir", name: "Noir", style: { inset: "5%", border: "0.4cqw solid #121113", borderRadius: "12cqw" } },
  { id: "emerald", name: "Emerald", style: { inset: "2.5%", border: "1.6cqw solid #3A5A40", boxShadow: "inset 0 0 0 0.6cqw #D4AF37" } },
];

const HEART = "M50 90 C22 68 4 50 4 31 A22 22 0 0 1 50 22 A22 22 0 0 1 96 31 C96 50 78 68 50 90Z";
const STAR = "50,4 61,37 96,37 68,58 79,92 50,71 21,92 32,58 4,37 39,37";
const SPARKLE = "M50 0 C55 35 65 45 100 50 C65 55 55 65 50 100 C45 65 35 55 0 50 C35 45 45 35 50 0Z";

export const SHAPES = ["rect", "rounded", "circle", "triangle", "heart", "star", "hexagon", "arch", "blob", "line"];

export function ShapeSvg({ shape, fill = "#E05A47", stroke = "none" }) {
  const p = { fill, stroke: stroke === "none" ? undefined : stroke, strokeWidth: stroke === "none" ? 0 : 3, vectorEffect: "non-scaling-stroke" };
  const body = {
    rect: <rect width="100" height="100" {...p} />,
    rounded: <rect width="100" height="100" rx="18" {...p} />,
    circle: <ellipse cx="50" cy="50" rx="50" ry="50" {...p} />,
    triangle: <polygon points="50,0 100,100 0,100" {...p} />,
    heart: <path d={HEART} {...p} />,
    star: <polygon points={STAR} {...p} />,
    hexagon: <polygon points="25,0 75,0 100,50 75,100 25,100 0,50" {...p} />,
    arch: <path d="M0 100 V50 A50 50 0 0 1 100 50 V100Z" {...p} />,
    blob: <path d="M70 5 C95 15 100 45 90 70 C80 95 45 100 22 88 C0 76 -2 45 10 25 C22 5 45 -5 70 5Z" {...p} />,
    line: <rect y="44" width="100" height="12" {...p} />,
  }[shape];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ overflow: "visible", display: "block" }}>
      {body}
    </svg>
  );
}

const Petals = ({ color, center }) => (
  <>
    {[0, 72, 144, 216, 288].map((r) => (
      <ellipse key={r} cx="50" cy="26" rx="16" ry="24" fill={color} transform={`rotate(${r} 50 50)`} />
    ))}
    <circle cx="50" cy="50" r="14" fill={center} />
  </>
);

export const CLIPART = {
  heart: { name: "Heart", svg: <path d={HEART} fill="#E05A47" /> },
  star: { name: "Star", svg: <polygon points={STAR} fill="#D4AF37" /> },
  sparkle: { name: "Sparkle", svg: <path d={SPARKLE} fill="#F6E7B0" stroke="#D4AF37" strokeWidth="2" /> },
  balloon: {
    name: "Balloon",
    svg: (
      <>
        <path d="M50 74 Q46 86 54 92 Q46 98 50 100" stroke="#8a7f75" strokeWidth="1.5" fill="none" />
        <ellipse cx="50" cy="38" rx="28" ry="34" fill="#E05A47" />
        <ellipse cx="40" cy="26" rx="6" ry="10" fill="#fff" opacity="0.35" />
        <polygon points="45,73 55,73 50,66" fill="#C84B39" />
      </>
    ),
  },
  cake: {
    name: "Cake",
    svg: (
      <>
        <rect x="12" y="56" width="76" height="36" rx="4" fill="#E8A598" />
        <rect x="20" y="36" width="60" height="22" rx="4" fill="#FAF7F2" stroke="#E8A598" strokeWidth="2" />
        <path d="M12 64 Q25 72 37 64 T62 64 T88 64" stroke="#FAF7F2" strokeWidth="4" fill="none" />
        {[34, 50, 66].map((x) => (
          <g key={x}>
            <rect x={x - 2.5} y="20" width="5" height="16" fill="#3A5A40" />
            <ellipse cx={x} cy="14" rx="4" ry="6" fill="#FFD166" />
          </g>
        ))}
      </>
    ),
  },
  gift: {
    name: "Gift",
    svg: (
      <>
        <rect x="14" y="42" width="72" height="50" rx="3" fill="#3A5A40" />
        <rect x="9" y="30" width="82" height="15" rx="3" fill="#4F7A56" />
        <rect x="45" y="30" width="10" height="62" fill="#D4AF37" />
        <ellipse cx="38" cy="24" rx="13" ry="7" fill="none" stroke="#D4AF37" strokeWidth="5" transform="rotate(-20 38 24)" />
        <ellipse cx="62" cy="24" rx="13" ry="7" fill="none" stroke="#D4AF37" strokeWidth="5" transform="rotate(20 62 24)" />
      </>
    ),
  },
  flower: { name: "Flower", svg: <Petals color="#E8A598" center="#D4AF37" /> },
  daisy: { name: "Daisy", svg: <Petals color="#FFFFFF" center="#FFD166" /> },
  leaf: {
    name: "Leaf",
    svg: (
      <>
        <path d="M50 96 C12 72 12 26 50 4 C88 26 88 72 50 96Z" fill="#6B8F71" />
        <path d="M50 96 L50 12" stroke="#3A5A40" strokeWidth="2.5" />
      </>
    ),
  },
  sun: {
    name: "Sun",
    svg: (
      <>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
          <rect key={r} x="47" y="2" width="6" height="18" rx="3" fill="#F28C28" transform={`rotate(${r} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="24" fill="#FFD166" />
      </>
    ),
  },
  moon: { name: "Moon", svg: <path d="M62 8 A42 42 0 1 0 92 70 A34 34 0 1 1 62 8Z" fill="#F6E7B0" /> },
  crown: {
    name: "Crown",
    svg: (
      <>
        <polygon points="8,82 8,30 30,52 50,18 70,52 92,30 92,82" fill="#D4AF37" />
        {[8, 50, 92].map((x, i) => <circle key={x} cx={x} cy={[30, 18, 30][i]} r="6" fill="#E05A47" />)}
        <rect x="8" y="74" width="84" height="8" fill="#B8962E" />
      </>
    ),
  },
  ring: {
    name: "Rings",
    svg: (
      <>
        <circle cx="38" cy="58" r="24" fill="none" stroke="#D4AF37" strokeWidth="6" />
        <circle cx="62" cy="58" r="24" fill="none" stroke="#D4AF37" strokeWidth="6" />
        <polygon points="62,22 70,30 62,40 54,30" fill="#B8D8E8" stroke="#fff" strokeWidth="1.5" />
      </>
    ),
  },
  note: {
    name: "Music",
    svg: (
      <>
        <rect x="58" y="10" width="6" height="62" fill="#121113" />
        <path d="M64 10 Q86 18 82 40 Q78 26 64 26Z" fill="#121113" />
        <ellipse cx="50" cy="74" rx="15" ry="11" fill="#121113" transform="rotate(-20 50 74)" />
      </>
    ),
  },
  butterfly: {
    name: "Butterfly",
    svg: (
      <>
        <ellipse cx="30" cy="36" rx="22" ry="26" fill="#C9A7D8" transform="rotate(-20 30 36)" />
        <ellipse cx="70" cy="36" rx="22" ry="26" fill="#C9A7D8" transform="rotate(20 70 36)" />
        <ellipse cx="34" cy="72" rx="15" ry="18" fill="#E8A598" />
        <ellipse cx="66" cy="72" rx="15" ry="18" fill="#E8A598" />
        <rect x="47" y="24" width="6" height="64" rx="3" fill="#121113" />
      </>
    ),
  },
  cloud: { name: "Cloud", svg: <path d="M24 78 A18 18 0 0 1 22 42 A24 24 0 0 1 66 32 A20 20 0 0 1 80 78Z" fill="#FFFFFF" stroke="#B8D8E8" strokeWidth="2" /> },
  tree: {
    name: "Pine",
    svg: (
      <>
        <polygon points="50,4 82,48 18,48" fill="#3A5A40" />
        <polygon points="50,26 90,80 10,80" fill="#4F7A56" />
        <rect x="44" y="80" width="12" height="16" fill="#8B5E3C" />
        <polygon points={STAR} fill="#D4AF37" transform="translate(40 -2) scale(0.2)" />
      </>
    ),
  },
};

export function ClipartSvg({ k }) {
  const c = CLIPART[k];
  if (!c) return null;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
      {c.svg}
    </svg>
  );
}

const square = (w, ratio) => +(w * ratio).toFixed(2);

export const makeText = (preset = {}) => ({
  id: uid(), type: "text", text: "Your words here", x: 10, y: 42, w: 80, rot: 0, opacity: 1,
  font: "Playfair Display", size: 7, color: "#121113", align: "center", weight: 400, italic: false, ...preset,
});
export const makeShape = (shape, ratio) => ({ id: uid(), type: "shape", shape, x: 35, y: 35, w: 30, h: square(30, ratio), rot: 0, opacity: 1, fill: "#E05A47", stroke: "none" });
export const makeClipart = (key, ratio) => ({ id: uid(), type: "clipart", key, x: 35, y: 35, w: 28, h: square(28, ratio), rot: 0, opacity: 1 });
export const makeImage = (src, ratio, fit = "contain", w = 34) => ({ id: uid(), type: "image", src, x: (100 - w) / 2, y: 30, w, h: square(w, ratio), rot: 0, opacity: 1, fit, radius: 0 });

export const blankDesign = () => ({ size: "portrait", bg: { type: "color", value: "#FFFDF9" }, frame: "classic", elements: [makeText({ text: "Hello there", font: "Great Vibes", size: 12, color: "#E05A47", y: 38 })] });

export const withFreshIds = (design) => ({ ...design, elements: (design.elements || []).map((e) => ({ ...e, id: uid() })) });
