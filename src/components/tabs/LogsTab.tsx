import { useEffect, useRef, useState } from "react";
import { Eraser, FolderOpen } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useConnectionStore } from "@/state/connectionStore";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * The "Logs" tab — used to be a nested accordion at the bottom of
 * AdvancedPanel.tsx; now that the Connect flow's raw output isn't
 * competing for space with the settings above it, it gets its own tab and
 * can just fill the available height instead of capping itself at
 * max-h-64.
 */
export function LogsTab() {
  const logs = useConnectionStore((s) => s.logs);
  const clearLogs = useConnectionStore((s) => s.clearLogs);
  const { t } = useLanguage();
  const [autoScroll, setAutoScroll] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  return (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      <div
        ref={viewportRef}
        dir="ltr"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
        }}
        className="min-h-0 flex-1 overflow-y-auto rounded-md bg-surface-1 p-2 text-left font-mono text-xs text-muted-foreground ring-1 ring-border"
      >
        {logs.length === 0 ? (
          <p className="text-status-idle">{t.advanced.noOutput}</p>
        ) : (
          logs.map((l, i) => <p key={i}>{l.line}</p>)
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => void invoke("open_log_folder")}
          className="flex items-center gap-1 text-[11px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        >
          <FolderOpen size={11} />
          {t.advanced.openLogsFolder}
        </button>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={clearLogs}
            className="flex items-center gap-1 text-[11px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          >
            <Eraser size={11} />
            {t.advanced.clearLogs}
          </button>
        )}
      </div>
    </div>
  );
}
