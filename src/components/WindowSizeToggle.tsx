import { useEffect, useState } from "react";
import { Expand, Shrink } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useLanguage } from "@/i18n/LanguageContext";
import type { AppSettings } from "@/types/connection";

/**
 * Toggles between the normal window size and a small fixed one (see
 * main.rs's NORMAL_SIZE/COMPACT_SIZE). Deliberately a title-bar icon button
 * rather than a switch buried in Advanced — needing to expand a panel
 * first would defeat the point for someone who specifically wants the
 * window small. The actual resize happens in Rust (commands.rs::
 * set_compact_window), both so a restart applies it before the window
 * ever shows (no flash-then-shrink) and so this stays a single source of
 * truth shared with that startup path.
 */
export function WindowSizeToggle() {
  const { t } = useLanguage();
  const [compact, setCompact] = useState<boolean | null>(null);

  useEffect(() => {
    invoke<AppSettings>("get_app_settings")
      .then((settings) => setCompact(settings.compact_window))
      .catch((e) => console.error("Failed to load window size setting:", e));
  }, []);

  function toggle() {
    if (compact === null) return;
    const next = !compact;
    setCompact(next); // optimistic — the resize itself is effectively instant
    invoke("set_compact_window", { enabled: next }).catch((e) => {
      console.error("Failed to resize window:", e);
      setCompact(!next); // revert on failure
    });
  }

  const label = compact ? t.titleBar.normalSize : t.titleBar.compactSize;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={compact === null}
      aria-label={label}
      className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
    >
      {compact ? <Expand size={14} /> : <Shrink size={14} />}
    </button>
  );
}
