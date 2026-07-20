import { useEffect } from "react";
import { DropdownMenu } from "radix-ui";
import { invoke } from "@tauri-apps/api/core";
import { ExternalLink, RefreshCw, Rocket } from "lucide-react";
import { useUpdateStore } from "@/state/updateStore";
import { useLanguage } from "@/i18n/LanguageContext";

function formatDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Deliberately separate from LanguageSwitcher/ThemeSwitcher despite sitting
 * right next to them — this one has actual state (an update badge) and a
 * network action behind it, not just a static preference toggle. See
 * update.rs for the whole mechanism (why this is delta-based against a
 * "last seen" tag rather than an absolute bundled-version check, since
 * Aether has no `--version` flag to compare against).
 */
export function UpdateMenu() {
  const { info, checking, checkNow, acknowledge } = useUpdateStore();
  const { t, lang } = useLanguage();

  // One check per app session on first mount of this component is enough;
  // the real startup check already happened in Rust before the window
  // even showed (see main.rs's setup()) — this is just a safety net for
  // the (rare) case this component mounts before that result arrived.
  useEffect(() => {
    if (!info) void checkNow();
  }, [info, checkNow]);

  const updateAvailable = info?.update_available ?? false;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t.update.toggle}
          className="relative grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Rocket size={14} />
          {updateAvailable && (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-status-connected" />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-64 rounded-lg bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="px-1 pb-2 text-xs font-medium text-foreground">{t.update.engineTitle}</div>

          {info ? (
            <div className="flex flex-col gap-1 px-1 pb-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t.update.latest}</span>
                <span dir="ltr" className="font-mono text-foreground">v{info.latest_version}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t.update.published}</span>
                <span dir="ltr">{formatDate(info.published_at, lang)}</span>
              </div>
              <p className="pt-1 text-[11px] text-muted-foreground">
                {updateAvailable ? t.update.available : t.update.upToDate}
              </p>
            </div>
          ) : (
            <p className="px-1 pb-2 text-[11px] text-muted-foreground">
              {checking ? t.update.checking : t.update.unknown}
            </p>
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-foreground/10" />

          {info && (
            <DropdownMenu.Item
              onSelect={() => {
                void acknowledge();
                void invoke("open_external_url", { url: info.release_url });
              }}
              className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none select-none focus:bg-accent focus:text-accent-foreground"
            >
              <ExternalLink size={13} className="shrink-0" />
              {t.update.viewRelease}
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault(); // keep the menu open while the check runs
              void checkNow();
            }}
            className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none select-none focus:bg-accent focus:text-accent-foreground"
          >
            <RefreshCw size={13} className={`shrink-0 ${checking ? "animate-spin" : ""}`} />
            {checking ? t.update.checking : t.update.checkNow}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
