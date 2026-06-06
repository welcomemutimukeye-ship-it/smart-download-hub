import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Play, Square, Trash2, Settings, Share2, X, Scissors,
  Archive, FileText, Music, Package, Video, CheckCircle2, Clock,
  Search, Cpu, HardDrive, Wifi, ArrowDownToLine, ArrowUpFromLine,
  Save, RotateCcw, Folder, Bell, CalendarClock, Layers,
} from "lucide-react";
import trimPreview from "@/assets/trim-preview.jpg";
import { usePrefs, loadQueue, saveQueue, DEFAULT_PREFS, type Prefs, type CategoryRule } from "@/lib/forge-storage";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forge Downloader — Smart download manager" },
      { name: "description", content: "Multi-threaded download manager with Smart Trim for video and LAN peer sharing." },
    ],
  }),
  component: Index,
});

type Status = "Downloading" | "Paused" | "Queued" | "Complete" | "Error";

type DLItem = {
  id: string;
  name: string;
  category: "Compressed" | "Documents" | "Music" | "Programs" | "Video";
  sizeMB: number;
  status: Status;
  speedKBs: number;
  progress: number; // 0-100
  etaSec: number;
  lastTry: string;
};

const SEED: DLItem[] = [
  { id: "1", name: "archive_final_render_v2.mp4", category: "Video", sizeMB: 2440, status: "Downloading", speedKBs: 12400, progress: 64, etaSec: 252, lastTry: "09:42:11" },
  { id: "2", name: "ubuntu-22.04-desktop-amd64.iso", category: "Programs", sizeMB: 3600, status: "Paused", speedKBs: 0, progress: 12, etaSec: 0, lastTry: "08:15:00" },
  { id: "3", name: "project_assets_pack.zip", category: "Compressed", sizeMB: 892, status: "Complete", speedKBs: 0, progress: 100, etaSec: 0, lastTry: "Yesterday" },
  { id: "4", name: "Tutorial_Advanced_React_Patterns.pdf", category: "Documents", sizeMB: 24, status: "Complete", speedKBs: 0, progress: 100, etaSec: 0, lastTry: "Yesterday" },
  { id: "5", name: "ambient_focus_loop.flac", category: "Music", sizeMB: 142, status: "Downloading", speedKBs: 4800, progress: 41, etaSec: 18, lastTry: "10:01:22" },
  { id: "6", name: "Blender-4.2-windows-x64.msi", category: "Programs", sizeMB: 312, status: "Queued", speedKBs: 0, progress: 0, etaSec: 0, lastTry: "—" },
  { id: "7", name: "design_inspiration_board.zip", category: "Compressed", sizeMB: 1280, status: "Error", speedKBs: 0, progress: 88, etaSec: 0, lastTry: "07:11:04" },
  { id: "8", name: "Keynote_Q3_2026_Recording.mp4", category: "Video", sizeMB: 5200, status: "Downloading", speedKBs: 9100, progress: 22, etaSec: 460, lastTry: "10:02:11" },
];

const CATEGORIES = [
  { key: "All", label: "All Downloads", icon: ArrowDownToLine },
  { key: "Compressed", label: "Compressed", icon: Archive },
  { key: "Documents", label: "Documents", icon: FileText },
  { key: "Music", label: "Music", icon: Music },
  { key: "Programs", label: "Programs", icon: Package },
  { key: "Video", label: "Video", icon: Video },
] as const;

const STATUS_FILTERS = [
  { key: "Finished", label: "Finished", icon: CheckCircle2 },
  { key: "Unfinished", label: "Unfinished", icon: Clock },
] as const;

const PEERS = [
  { name: "Workstation-Alpha", ip: "192.168.1.14", online: true, files: 24 },
  { name: "Media-Vault-01", ip: "192.168.1.100", online: false, files: 0 },
  { name: "Studio-MBP", ip: "192.168.1.22", online: true, files: 11 },
];

function fmtSize(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb} MB`;
}
function fmtETA(s: number) {
  if (s <= 0) return "—";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
function fmtSpeed(kbs: number) {
  if (kbs === 0) return "0 KB/s";
  if (kbs >= 1024) return `${(kbs / 1024).toFixed(1)} MB/s`;
  return `${kbs} KB/s`;
}

function Index() {
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>("1");
  const [trimOpen, setTrimOpen] = useState(false);
  const [trimItem, setTrimItem] = useState<DLItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [lanOpen, setLanOpen] = useState(false);

  const rows = useMemo(() => {
    return SEED.filter((r) => {
      if (filter === "All") return true;
      if (filter === "Finished") return r.status === "Complete";
      if (filter === "Unfinished") return r.status !== "Complete";
      return r.category === filter;
    }).filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [filter, search]);

  const totalSpeed = SEED.filter((r) => r.status === "Downloading").reduce((a, b) => a + b.speedKBs, 0);

  return (
    <div className="flex h-screen w-full bg-surface font-sans text-zinc-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-zinc-900 bg-panel flex flex-col">
        <div className="h-14 px-4 border-b border-zinc-900 flex items-center gap-2">
          <div className="size-7 grid place-items-center rounded-md bg-brand/15 ring-1 ring-brand/40">
            <ArrowDownToLine className="size-3.5 text-brand" />
          </div>
          <div className="leading-tight">
            <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">FORGE</h2>
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Downloader v1.0</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <SideBtn active={filter === "All"} onClick={() => setFilter("All")} icon={ArrowDownToLine} label="All Downloads" count={SEED.length} />
          <Section label="Categories" />
          {CATEGORIES.slice(1).map((c) => (
            <SideBtn
              key={c.key}
              active={filter === c.key}
              onClick={() => setFilter(c.key)}
              icon={c.icon}
              label={c.label}
              count={SEED.filter((r) => r.category === c.key).length}
            />
          ))}
          <Section label="Status" />
          {STATUS_FILTERS.map((s) => (
            <SideBtn
              key={s.key}
              active={filter === s.key}
              onClick={() => setFilter(s.key)}
              icon={s.icon}
              label={s.label}
              count={
                s.key === "Finished"
                  ? SEED.filter((r) => r.status === "Complete").length
                  : SEED.filter((r) => r.status !== "Complete").length
              }
            />
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Nearby Devices</span>
            <button onClick={() => setLanOpen(true)} className="text-[10px] text-brand hover:underline font-mono">OPEN</button>
          </div>
          <div className="space-y-2">
            {PEERS.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <div className={`size-2 rounded-full ${p.online ? "bg-brand shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-700"}`} />
                <span className={`text-xs truncate ${p.online ? "text-zinc-300" : "text-zinc-500"}`}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-zinc-900 bg-panel/60 backdrop-blur-md flex items-center px-4 justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAddOpen(true)}
              className="bg-brand text-zinc-950 px-3 py-1.5 rounded-md text-[13px] font-semibold flex items-center gap-1.5 ring-1 ring-brand hover:bg-brand/90 transition-colors"
            >
              <Plus className="size-3.5" /> Add URL
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-2" />
            <ToolBtn icon={Play} label="Resume" />
            <ToolBtn icon={Square} label="Stop" />
            <ToolBtn icon={Trash2} label="Delete" danger />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="size-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter…"
                className="bg-zinc-900/80 border border-zinc-800 text-[12px] rounded-md pl-7 pr-3 py-1.5 w-56 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-zinc-600"
              />
            </div>
            <button className="text-zinc-400 hover:text-zinc-100 text-[13px] font-medium flex items-center gap-1.5">
              <Settings className="size-3.5" /> Options
            </button>
            <button
              onClick={() => setLanOpen(true)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-1.5 rounded-md text-[13px] font-medium ring-1 ring-black/5 hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
            >
              <Share2 className="size-3.5" /> LAN Share
            </button>
          </div>
        </header>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-zinc-900 bg-zinc-950/60 backdrop-blur">
                {["File Name", "Size", "Status", "Time Left", "Speed", "Progress", "Last Try"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={`group border-b border-zinc-900/60 cursor-pointer transition-colors ${
                    selected === r.id ? "bg-brand/[0.06]" : "hover:bg-zinc-800/20"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-zinc-100 truncate max-w-[28rem]">{r.name}</span>
                      {r.category === "Video" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setTrimItem(r); setTrimOpen(true); }}
                          className="text-[10px] text-brand uppercase tracking-wider mt-0.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-fit"
                        >
                          <Scissors className="size-3" /> Open Smart Trim
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-[12px]">{fmtSize(r.sizeMB)}</td>
                  <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-[12px]">{fmtETA(r.etaSec)}</td>
                  <td className="px-4 py-3 text-zinc-200 font-mono text-[12px]">{fmtSpeed(r.speedKBs)}</td>
                  <td className="px-4 py-3">
                    <div className="w-36">
                      <div className="flex justify-between text-[10px] mb-1 text-zinc-500 font-mono">
                        <span>{r.progress}%</span>
                        <span>{fmtSize(Math.round((r.sizeMB * r.progress) / 100))}</span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            r.status === "Error"
                              ? "bg-red-500"
                              : r.status === "Paused"
                              ? "bg-zinc-600"
                              : "bg-brand"
                          }`}
                          style={{ width: `${r.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-[12px]">{r.lastTry}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="text-center text-zinc-600 py-16 text-sm">No downloads match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Status bar */}
        <footer className="h-7 shrink-0 border-t border-zinc-900 bg-panel flex items-center px-4 justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><ArrowDownToLine className="size-3 text-brand" /> {fmtSpeed(totalSpeed)}</span>
            <span className="flex items-center gap-1.5"><ArrowUpFromLine className="size-3" /> 124 KB/s</span>
            <span className="flex items-center gap-1.5"><Cpu className="size-3" /> 8 threads / segment</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Active: {SEED.filter((r) => r.status === "Downloading").length}</span>
            <span>Queued: {SEED.filter((r) => r.status === "Queued").length}</span>
            <span className="flex items-center gap-1.5"><HardDrive className="size-3 text-brand" /> 124.2 GB Free</span>
          </div>
        </footer>
      </main>

      {trimOpen && trimItem && <TrimDialog item={trimItem} onClose={() => setTrimOpen(false)} />}
      {addOpen && <AddDialog onClose={() => setAddOpen(false)} />}
      {lanOpen && <LanDialog onClose={() => setLanOpen(false)} />}
    </div>
  );
}

function Section({ label }: { label: string }) {
  return <div className="pt-4 pb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</div>;
}

function SideBtn({
  active, onClick, icon: Icon, label, count,
}: { active: boolean; onClick: () => void; icon: any; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ring-1 ${
        active
          ? "bg-zinc-800 text-brand ring-black/5"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 ring-transparent"
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon className={`size-3.5 ${active ? "text-brand" : "text-zinc-500"}`} />
        {label}
      </span>
      <span className="text-[10px] font-mono text-zinc-500">{count}</span>
    </button>
  );
}

function ToolBtn({ icon: Icon, label, danger }: { icon: any; label: string; danger?: boolean }) {
  return (
    <button className={`text-zinc-400 hover:text-zinc-100 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors hover:bg-zinc-800/50 ${danger ? "hover:text-red-400" : ""}`}>
      <Icon className="size-3.5" />
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    Downloading: "text-brand bg-brand/10 ring-brand/20",
    Paused: "text-amber-400 bg-amber-400/10 ring-amber-400/20",
    Queued: "text-zinc-400 bg-zinc-700/30 ring-zinc-600/30",
    Complete: "text-zinc-200 bg-zinc-700/40 ring-zinc-600/30",
    Error: "text-red-400 bg-red-500/10 ring-red-500/20",
  };
  return (
    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ring-1 ${map[status]}`}>
      {status}
    </span>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-panel rounded-lg ring-1 ring-zinc-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-900 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const VIDEO_DURATION = 1200; // seconds (20 min)

function TrimDialog({ item, onClose }: { item: DLItem; onClose: () => void }) {
  const [start, setStart] = useState(134); // 02:14
  const [end, setEnd] = useState(780); // 13:00
  const selectedDur = Math.max(0, end - start);
  const ratio = selectedDur / VIDEO_DURATION;
  const trimmedMB = Math.round(item.sizeMB * ratio);
  const savedPct = ((1 - ratio) * 100).toFixed(1);

  function fmtT(s: number) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  const startPct = (start / VIDEO_DURATION) * 100;
  const endPct = (end / VIDEO_DURATION) * 100;

  return (
    <Modal title={`Smart Trim — ${item.name}`} onClose={onClose}>
      <div className="p-6 space-y-6">
        <div className="relative w-full aspect-video bg-zinc-900 rounded-md overflow-hidden ring-1 ring-white/5">
          <img src={trimPreview} alt="Video preview frame" loading="lazy" width={1280} height={704} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-300">
            <span>Preview · 1080p</span>
            <span>{fmtT(start)} → {fmtT(end)}</span>
          </div>
        </div>

        {/* Dual slider */}
        <div className="space-y-3">
          <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            <span>Selection Range</span>
            <span>Total: {fmtT(VIDEO_DURATION)}</span>
          </div>

          <div className="relative h-10 select-none">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-zinc-800 rounded-full" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 bg-brand rounded-full shadow-[0_0_12px_rgba(16,185,129,0.45)]"
              style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
            />
            <input
              type="range" min={0} max={VIDEO_DURATION} value={start}
              onChange={(e) => setStart(Math.min(Number(e.target.value), end - 5))}
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:ring-4 [&::-webkit-slider-thumb]:ring-zinc-900 [&::-webkit-slider-thumb]:cursor-grab"
            />
            <input
              type="range" min={0} max={VIDEO_DURATION} value={end}
              onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 5))}
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:ring-4 [&::-webkit-slider-thumb]:ring-zinc-900 [&::-webkit-slider-thumb]:cursor-grab"
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-brand">
            <span>{fmtT(start)}</span>
            <span className="text-zinc-400">Duration: {fmtT(selectedDur)}</span>
            <span>{fmtT(end)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Original Size" value={fmtSize(item.sizeMB)} />
          <Stat label="Trimmed Size" value={fmtSize(trimmedMB)} highlight />
          <Stat label="You Save" value={`${savedPct}%`} brand />
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-900 pt-3">
          Smart Trim uses byte-range requests to fetch <span className="text-zinc-300 font-mono">only the selected segment</span> —
          the full file is never downloaded. Implemented locally with <span className="font-mono">yt-dlp --download-sections</span>.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          <button onClick={onClose} className="bg-brand text-zinc-950 px-4 py-2 rounded-md text-sm font-semibold ring-1 ring-brand hover:bg-brand/90 transition-colors flex items-center gap-1.5">
            <Scissors className="size-3.5" /> Confirm Trim & Download
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, brand, highlight }: { label: string; value: string; brand?: boolean; highlight?: boolean }) {
  return (
    <div className={`px-3 py-2.5 rounded-md ring-1 ${brand ? "bg-brand/10 ring-brand/30" : "bg-zinc-900 ring-zinc-800"}`}>
      <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">{label}</p>
      <p className={`text-lg font-mono font-medium mt-0.5 ${brand ? "text-brand" : highlight ? "text-zinc-100" : "text-zinc-300"}`}>{value}</p>
    </div>
  );
}

function AddDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  return (
    <Modal title="Add New Download" onClose={onClose}>
      <div className="p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/file.zip"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-zinc-600 font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Segments</label>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand font-mono">
              <option>8</option><option>16</option><option>32</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Category (AI sorted)</label>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand font-mono">
              <option>Auto-detect</option><option>Compressed</option><option>Documents</option><option>Music</option><option>Programs</option><option>Video</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5">
          <span className="text-[11px] text-zinc-400">Schedule for later</span>
          <input type="datetime-local" className="bg-transparent text-[11px] font-mono text-zinc-300 outline-none" />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200">Cancel</button>
          <button onClick={onClose} className="bg-brand text-zinc-950 px-4 py-2 rounded-md text-sm font-semibold ring-1 ring-brand hover:bg-brand/90 flex items-center gap-1.5">
            <Plus className="size-3.5" /> Queue Download
          </button>
        </div>
      </div>
    </Modal>
  );
}

function LanDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="LAN Share — Nearby Devices" onClose={onClose}>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-md p-3">
          <div className="flex items-center gap-2">
            <Wifi className="size-4 text-brand" />
            <div>
              <p className="text-[12px] text-zinc-200">Broadcasting on local network</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase">UDP :47551 · HTTP :8080</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand">Online</span>
        </div>

        <div className="border border-zinc-800 rounded-md overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/60">
              <tr className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                <th className="px-3 py-2 font-semibold">Device</th>
                <th className="px-3 py-2 font-semibold">Address</th>
                <th className="px-3 py-2 font-semibold">Shared</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {PEERS.map((p) => (
                <tr key={p.name} className="border-t border-zinc-900">
                  <td className="px-3 py-2.5 text-zinc-200 flex items-center gap-2">
                    <span className={`size-2 rounded-full ${p.online ? "bg-brand shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-700"}`} />
                    {p.name}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400 font-mono text-[12px]">{p.ip}</td>
                  <td className="px-3 py-2.5 text-zinc-400 font-mono text-[12px]">{p.files} files</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      disabled={!p.online}
                      className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded ring-1 disabled:opacity-30 disabled:cursor-not-allowed text-brand bg-brand/10 ring-brand/20 hover:bg-brand/20 transition-colors"
                    >
                      Browse
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-900 pt-3">
          Transfers run over the local router at maximum LAN speed — no internet data is used.
          Peer discovery uses UDP broadcast; file serving uses a built-in HTTP server scoped to your shared folder.
        </p>
      </div>
    </Modal>
  );
}
