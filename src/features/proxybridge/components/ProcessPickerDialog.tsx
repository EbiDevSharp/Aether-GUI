import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { proxyBridgeApi } from "@/lib/proxybridge-api";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ProcessInfo } from "@/types/proxybridge";

interface ProcessPickerDialogProps {
  onSelect: (processName: string) => void;
  onClose: () => void;
}

export function ProcessPickerDialog({ onSelect, onClose }: ProcessPickerDialogProps) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { t } = useLanguage();
  const tt = t.proxybridge.processPicker;

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const list = await proxyBridgeApi.listRunningProcesses();
      setProcesses(list);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return processes;
    return processes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.exe_path ?? "").toLowerCase().includes(q),
    );
  }, [processes, query]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="flex h-[28rem] w-full max-w-md flex-col rounded-lg border bg-background p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-medium">{tt.title}</h3>
          <button
            onClick={load}
            title={tt.refresh}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="relative mb-2">
          <Search size={14} className="absolute start-2.5 top-2.5 text-muted-foreground" />
          <input
            autoFocus
            className="input ps-8"
            dir="ltr"
            placeholder={tt.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
          {loading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">{tt.loading}</p>
          ) : err ? (
            <p className="p-4 text-center text-sm text-destructive">{err}</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">{tt.empty}</p>
          ) : (
            <ul>
              {filtered.map((p) => (
                <li key={p.name}>
                  <button
                    onClick={() => {
                      onSelect(p.name);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between border-b px-3 py-2 text-start text-sm last:border-b-0 hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <div className="font-mono" dir="ltr">{p.name}</div>
                      {p.exe_path && (
                        <div className="truncate text-xs text-muted-foreground" dir="ltr">
                          {p.exe_path}
                        </div>
                      )}
                    </div>
                    {p.instance_count > 1 && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        ×{p.instance_count}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            {tt.close}
          </button>
        </div>
      </div>
    </div>
  );
}
