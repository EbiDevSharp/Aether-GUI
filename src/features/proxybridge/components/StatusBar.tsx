import { Play, Square, ShieldAlert, Terminal } from "lucide-react";
import { useState } from "react";
import { useProxyBridgeStore } from "@/store/proxybridge-store";
import { useLanguage } from "@/i18n/LanguageContext";

const statusColor: Record<string, string> = {
  idle: "bg-muted text-muted-foreground",
  needsElevation: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  starting: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  running: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  stopping: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  stopped: "bg-muted text-muted-foreground",
  error: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function StatusBar() {
  const status = useProxyBridgeStore((s) => s.status);
  const start = useProxyBridgeStore((s) => s.start);
  const stop = useProxyBridgeStore((s) => s.stop);
  const relaunchElevated = useProxyBridgeStore((s) => s.relaunchElevated);
  const logs = useProxyBridgeStore((s) => s.logs);
  const [showLogs, setShowLogs] = useState(false);
  const { t } = useLanguage();

  const statusLabel = t.proxybridge.status;
  const isRunning = status === "running" || status === "starting";

  return (
    <div className="border-b">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[status]}`}>
          {statusLabel[status as keyof typeof statusLabel] ?? status}
        </span>

        {status === "needsElevation" ? (
          <button
            onClick={relaunchElevated}
            className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
          >
            <ShieldAlert size={14} />
            {t.proxybridge.restartElevated}
          </button>
        ) : isRunning ? (
          <button
            onClick={stop}
            className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:opacity-90"
          >
            <Square size={14} />
            {t.proxybridge.stop}
          </button>
        ) : (
          <button
            onClick={start}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          >
            <Play size={14} />
            {t.proxybridge.startRouting}
          </button>
        )}

        <button
          onClick={() => setShowLogs((v) => !v)}
          // ms-auto (logical) instead of mr-auto: pushes to the far end of
          // the row regardless of ltr/rtl, so it stays put when the page
          // direction flips with the language.
          className="ms-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Terminal size={14} />
          {t.proxybridge.liveLogs(logs.length)}
        </button>
      </div>

      {showLogs && (
        <div className="max-h-48 overflow-y-auto border-t bg-black/90 p-3 font-mono text-xs text-green-400">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">{t.proxybridge.noLogsYet}</p>
          ) : (
            logs.map((l, i) => (
              <div key={i} className={l.stream === "stderr" ? "text-red-400" : undefined}>
                {l.line}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
