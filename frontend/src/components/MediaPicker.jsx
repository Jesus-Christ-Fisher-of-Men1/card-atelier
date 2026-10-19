import { useEffect, useRef, useState } from "react";
import { Mic, Square, Music, Video, Upload, Trash2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { api, uploadFile, mediaUrl, formatErr } from "@/lib/api";

const box = "rounded-2xl border border-stone-900/10 bg-white p-4";

function UploadBtn({ accept, onFile, label, testId, busy }) {
  const ref = useRef(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} data-testid={`${testId}-input`} />
      <button type="button" data-testid={testId} disabled={busy} onClick={() => ref.current.click()}
        className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border border-stone-900/15 hover:bg-stone-100 transition-colors disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {label}
      </button>
    </>
  );
}

export function SongPicker({ value, onChange }) {
  const [songs, setSongs] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/assets", { params: { type: "sound" } }).then((r) => setSongs(r.data)); }, []);
  const custom = value && !songs.some((s) => s.url === value);
  return (
    <div className={box} data-testid="song-picker">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium"><Music size={16} className="text-[#E05A47]" /> Background music</div>
      <select data-testid="song-select" value={custom ? "__custom" : value || ""} onChange={(e) => e.target.value !== "__custom" && onChange(e.target.value)}
        className="w-full text-sm rounded-xl border border-stone-900/15 px-3 py-2 bg-[#FAF7F2]">
        <option value="">No music</option>
        {songs.map((s) => <option key={s.id} value={s.url}>{s.name}</option>)}
        {custom && <option value="__custom">My uploaded song</option>}
      </select>
      <div className="flex items-center gap-2 mt-3">
        <UploadBtn accept="audio/*" label="Upload your song" testId="song-upload-btn" busy={busy}
          onFile={async (f) => { setBusy(true); try { onChange((await uploadFile(f)).url); toast.success("Song added"); } catch (e) { toast.error(formatErr(e)); } setBusy(false); }} />
      </div>
      {value && <audio key={value} controls src={mediaUrl(value)} className="w-full mt-3 h-9" data-testid="song-preview-audio" />}
    </div>
  );
}

export function VoiceRecorder({ value, onChange }) {
  const [rec, setRec] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (file) => {
    setBusy(true);
    try { onChange((await uploadFile(file)).url); toast.success("Voice message saved"); } catch (e) { toast.error(formatErr(e)); }
    setBusy(false);
  };
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
        save(new File([blob], "voice.webm", { type: blob.type.split(";")[0] }));
      };
      r.start();
      setRec(r);
    } catch (e) { toast.error("Microphone access was blocked"); }
  };
  const stop = () => { rec?.stop(); setRec(null); };
  return (
    <div className={box} data-testid="voice-recorder">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium"><Mic size={16} className="text-[#E05A47]" /> Voice message</div>
      <div className="flex flex-wrap items-center gap-2">
        {rec ? (
          <button type="button" onClick={stop} data-testid="voice-stop-btn" className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full bg-[#121113] text-white">
            <Square size={12} /> Stop <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </button>
        ) : (
          <button type="button" onClick={start} disabled={busy} data-testid="voice-record-btn" className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39] transition-colors disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />} Record
          </button>
        )}
        <UploadBtn accept="audio/*" label="Upload audio" testId="voice-upload-btn" busy={busy} onFile={save} />
        {value && <button type="button" onClick={() => onChange("")} data-testid="voice-remove-btn" className="p-2 rounded-full hover:bg-stone-100"><Trash2 size={14} /></button>}
      </div>
      {value && <audio key={value} controls src={mediaUrl(value)} className="w-full mt-3 h-9" data-testid="voice-preview-audio" />}
    </div>
  );
}

export function VideoPicker({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [videos, setVideos] = useState([]);
  useEffect(() => { api.get("/assets", { params: { type: "video" } }).then((r) => setVideos(r.data)); }, []);
  return (
    <div className={box} data-testid="video-picker">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium"><Video size={16} className="text-[#E05A47]" /> Video message</div>
      {videos.length > 0 && (
        <select data-testid="video-select" value={videos.some((v) => v.url === value) ? value : ""} onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm rounded-xl border border-stone-900/15 px-3 py-2 bg-[#FAF7F2] mb-3">
          <option value="">Choose a music video…</option>
          {videos.map((v) => <option key={v.id} value={v.url}>{v.name}</option>)}
        </select>
      )}
      <div className="flex items-center gap-2">
        <UploadBtn accept="video/*" label="Upload video" testId="video-upload-btn" busy={busy}
          onFile={async (f) => { setBusy(true); try { onChange((await uploadFile(f)).url); toast.success("Video added"); } catch (e) { toast.error(formatErr(e)); } setBusy(false); }} />
        {value && <button type="button" onClick={() => onChange("")} data-testid="video-remove-btn" className="p-2 rounded-full hover:bg-stone-100"><Trash2 size={14} /></button>}
      </div>
      {value && <video key={value} controls src={mediaUrl(value)} className="w-full mt-3 rounded-xl max-h-48 bg-black" data-testid="video-preview" />}
    </div>
  );
}

export function MediaFields({ value, onChange }) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs text-[#3A5A40] font-semibold" data-testid="privacy-note">
        <Lock size={13} /> Private: your uploads can only be opened by you and the people you send this card to.
      </p>
      <SongPicker value={value.song_url} onChange={(v) => onChange({ song_url: v })} />
      <VoiceRecorder value={value.voice_url} onChange={(v) => onChange({ voice_url: v })} />
      <VideoPicker value={value.video_url} onChange={(v) => onChange({ video_url: v })} />
    </div>
  );
}
