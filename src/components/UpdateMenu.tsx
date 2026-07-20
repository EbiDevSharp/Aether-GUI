import { useEffect } from "react";
import { DropdownMenu } from "radix-ui";
import { invoke } from "@tauri-apps/api/core";
import { ExternalLink, RefreshCw, Rocket } from "lucide-react";
import { useUpdateStore } from "@/state/updateStore";
import { useLanguage } from "@/i18n/LanguageContext";
import type { UpdateInfo, UpdateProduct } from "@/types/update";

function formatDate(iso: string, lang: string): string {
  if (!iso) return "";
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

interface SectionProps {
  product: UpdateProduct;
  title: string;
  info: UpdateInfo | null;
  checking: boolean;
}

/**
 * One product's block inside the dropdown (Engine or Gui) — separate from
 * the trigger/badge logic below so a third product later is just another
 * <UpdateSection /> plus one more entry in PRODUCTS, no new component.
 */
function UpdateSection({ product, title, info, checking }: SectionProps) {
  const { checkNow, acknowledge } = useUpdateStore();
  const { t, lang } = useLanguage();

  return (
    <div className="flex flex-col gap-1 px-1 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{title}</span>
        <button
          type="button"
          onClick={() => void checkNow(product)}
          aria-label={t.update.checkNow}
          className="grid size-5 place-items-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw size={11} className={checking ? "animate-spin" : ""} />
        </button>
      </div>

      {!info ? (
        <p className="text-[11px] text-muted-foreground">{checking ? t.update.checking : t.update.unknown}</p>
      ) : info.no_releases ? (
        <p className="text-[11px] text-muted-foreground">{t.update.noReleases}</p>
      ) : (
        <>
          {info.current_version && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{t.update.current}</span>
              <span dir="ltr" className="font-mono text-foreground">v{info.current_version}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t.update.latest}</span>
            <span dir="ltr" className="font-mono text-foreground">v{info.latest_version}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t.update.published}</span>
            <span dir="ltr">{formatDate(info.published_at, lang)}</span>
          </div>
          <p className="pt-0.5 text-[11px] text-muted-foreground">
            {info.update_available ? t.update.available : t.update.upToDate}
          </p>
          <DropdownMenu.Item
            onSelect={() => {
              void acknowledge(product);
              void invoke("open_external_url", { url: info.release_url });
            }}
            className="mt-1 flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none select-none focus:bg-accent focus:text-accent-foreground"
          >
            <ExternalLink size={13} className="shrink-0" />
            {t.update.viewRelease}
          </DropdownMenu.Item>
        </>
      )}
    </div>
  );
}

/**
 * Deliberately separate from LanguageSwitcher/ThemeSwitcher despite sitting
 * right next to them — this one has actual state (an update badge) and a
 * network action behind it, not just a static preference toggle. Covers
 * both the upstream Aether engine and Aether-GUI itself; see update.rs for
 * the whole mechanism and why the two use different "current version"
 * logic under the hood.
 */
export function UpdateMenu() {
  const { info, checking, checkNow } = useUpdateStore();
  const { t } = useLanguage();

  // One check per app session on first mount of this component is enough;
  // the real startup check already happened in Rust before the window even
  // showed (see main.rs's setup()) — this is just a safety net for the
  // (rare) case this component mounts before that result arrived.
  useEffect(() => {
    if (!info.engine) void checkNow("engine");
    if (!info.gui) void checkNow("gui");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateAvailable = info.engine?.update_available || info.gui?.update_available;

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
          className="z-50 w-64 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <UpdateSection product="engine" title={t.update.engineTitle} info={info.engine} checking={checking.engine} />
          <DropdownMenu.Separator className="my-0.5 h-px bg-foreground/10" />
          <UpdateSection product="gui" title={t.update.guiTitle} info={info.gui} checking={checking.gui} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
