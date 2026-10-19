import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, RotateCw } from "lucide-react";
import { CardCanvas } from "@/components/CardCanvas";
import { SIZES } from "@/lib/cardKit";
import { mediaUrl } from "@/lib/api";

const COLORS = ["#E05A47", "#D4AF37", "#E8A598", "#3A5A40", "#F6E7B0", "#FFFFFF"];

export function InsidePage({ card, small = false }) {
  const art = card.inside_bg;
  const bg = art ? { backgroundImage: `url("${mediaUrl(art)}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
  return (
    <div className={`w-full h-full flex flex-col justify-center text-center p-[8%] overflow-auto ${art ? "" : "bg-[#FFFDF9] paper-grain"}`} style={bg} data-testid="inside-page">
      <div className={art ? "bg-white/85 backdrop-blur-sm rounded-xl p-5 shadow-lg" : ""}>
        <p className={`font-script ${small ? "text-3xl" : "text-4xl"} text-[#E05A47] mb-3`}>Dear {card.recipient_name || "friend"},</p>
        <p className={`font-display ${small ? "text-base" : "text-lg"} leading-relaxed text-stone-800 whitespace-pre-wrap`}>{card.message || "Thinking of you."}</p>
        <p className={`font-script ${small ? "text-2xl" : "text-3xl"} text-[#3A5A40] mt-4`}>— {card.sender_name || "With love"}</p>
      </div>
    </div>
  );
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    i, left: Math.random() * 100, delay: Math.random() * 1.5, dur: 2.8 + Math.random() * 2.5,
    color: COLORS[i % COLORS.length], size: 6 + Math.random() * 8, round: Math.random() > 0.5,
  })), []);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-40">
      {bits.map((b) => (
        <span key={b.i} className="confetti-bit" style={{ left: `${b.left}%`, background: b.color, width: b.size, height: b.size * 0.6,
          borderRadius: b.round ? "50%" : 2, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />
      ))}
    </div>
  );
}

function Envelope({ onOpen, card }) {
  const [opening, setOpening] = useState(false);
  const click = () => { setOpening(true); setTimeout(onOpen, 900); };
  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">A card for {card.recipient_name || "you"}</p>
      <div className="envelope" data-testid="envelope">
        <div className={`envelope-flap ${opening ? "open" : ""}`} />
        <div className="envelope-body" />
        <button onClick={click} data-testid="envelope-open-btn" className={`wax-seal ${opening ? "broken" : ""}`}>Open</button>
      </div>
      <p className="font-display italic text-stone-300">from {card.sender_name || "someone who cares"}</p>
    </div>
  );
}

export function CardExperience({ card, dark = true }) {
  const [opened, setOpened] = useState(false);
  const [side, setSide] = useState("front");
  const [muted, setMuted] = useState(false);
  const audio = useRef(null);
  const ratio = SIZES[card.design?.size]?.ratio || 5 / 7;

  const open = () => { setOpened(true); audio.current?.play().catch(() => {}); };
  const playMedia = () => audio.current && (audio.current.volume = 0.25);
  useEffect(() => { if (audio.current) audio.current.muted = muted; }, [muted]);

  return (
    <div className={`relative min-h-full w-full flex items-center justify-center py-12 px-4 ${dark ? "bg-[#121113]" : ""}`} data-testid="card-experience">
      {card.song_url && <audio ref={audio} src={mediaUrl(card.song_url)} loop data-testid="experience-song-audio" />}
      {!opened ? (
        <Envelope onOpen={open} card={card} />
      ) : (
        <>
          <Confetti />
          <motion.div initial={{ y: 120, opacity: 0, scale: 0.85 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 16 }}
            className="relative z-50 w-full flex flex-col items-center gap-6">
            <div className="flip-scene" style={{ width: `min(92vw, ${ratio >= 1 ? 640 : 440}px)` }}>
              <div className={`flip-inner ${side === "inside" ? "flipped" : ""}`}>
                <div className="flip-face shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] rounded-md overflow-hidden">
                  <CardCanvas design={card.design} testId="experience-card-front" />
                </div>
                <div className="flip-face flip-back rounded-md overflow-hidden" data-testid="experience-card-inside">
                  <InsidePage card={card} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => setSide(side === "front" ? "inside" : "front")} data-testid="experience-flip-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39] transition-colors">
                <RotateCw size={16} /> {side === "front" ? "Read the message" : "See the front"}
              </button>
              {card.song_url && (
                <button onClick={() => setMuted(!muted)} data-testid="experience-mute-btn" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors">
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? "Music off" : "Music on"}
                </button>
              )}
            </div>
            {(card.voice_url || card.video_url) && (
              <div className="w-full max-w-md space-y-3">
                {card.voice_url && (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] mb-2">Voice message</p>
                    <audio controls src={mediaUrl(card.voice_url)} onPlay={playMedia} className="w-full" data-testid="experience-voice-audio" />
                  </div>
                )}
                {card.video_url && (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] mb-2">Video message</p>
                    <video controls src={mediaUrl(card.video_url)} onPlay={playMedia} className="w-full rounded-xl bg-black" data-testid="experience-video" />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
