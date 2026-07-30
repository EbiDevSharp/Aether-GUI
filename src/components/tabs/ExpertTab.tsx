import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { FieldRow } from "@/components/FieldRow";
import { NoizeProfileToggle } from "@/components/NoizeProfileToggle";
import { EchModeToggle } from "@/components/EchModeToggle";
import { useConnectionStore } from "@/state/connectionStore";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * The "Expert" tab — was ExpertPanel.tsx's collapsible content, kept
 * separate from Settings on purpose (see the original panel's doc-comment):
 * these are the options with the most direct effect on evading active
 * censorship, but also the ones most people never need to touch.
 */
export function ExpertTab() {
  const status = useConnectionStore((s) => s.status);
  const masqueHttp2 = useConnectionStore((s) => s.profile.masque_http2);
  const fragmentEnabled = useConnectionStore((s) => s.profile.fragment_enabled);
  const setFragmentEnabled = useConnectionStore((s) => s.setFragmentEnabled);
  const echMode = useConnectionStore((s) => s.profile.ech_mode);
  const echConfig = useConnectionStore((s) => s.profile.ech_config);
  const setEchConfig = useConnectionStore((s) => s.setEchConfig);
  const forcedPeer = useConnectionStore((s) => s.profile.forced_peer);
  const setForcedPeer = useConnectionStore((s) => s.setForcedPeer);
  const verboseLogs = useConnectionStore((s) => s.profile.verbose_logs);
  const setVerboseLogs = useConnectionStore((s) => s.setVerboseLogs);
  const { t } = useLanguage();

  const locked = status.state !== "Idle" && status.state !== "Error";
  // --fragment only does anything on the HTTP/2 transport (see
  // profiles.rs::ConnectionProfile::fragment_enabled) — greyed out rather
  // than hidden so switching MASQUE Transport to HTTP/2 later doesn't
  // silently lose a choice the user already made here.
  const fragmentDisabled = locked || !masqueHttp2;

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 py-4">
      <FieldRow
        label={t.expert.noizeProfile}
        tooltip={t.expert.noizeProfileTooltip}
        aboutLabel={t.advanced.about}
      >
        <NoizeProfileToggle />
      </FieldRow>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {t.expert.fragment}
          <Tooltip>
            <TooltipTrigger aria-label={t.advanced.about(t.expert.fragment)}>
              <Info size={12} />
            </TooltipTrigger>
            <TooltipContent>{t.expert.fragmentTooltip}</TooltipContent>
          </Tooltip>
        </div>
        <Switch
          checked={fragmentEnabled}
          onCheckedChange={setFragmentEnabled}
          disabled={fragmentDisabled}
          aria-label={t.expert.fragment}
        />
      </div>

      <FieldRow
        label={t.expert.echMode}
        tooltip={t.expert.echModeTooltip}
        aboutLabel={t.advanced.about}
      >
        <div className="flex flex-col gap-1.5">
          <EchModeToggle />
          {echMode === "custom" && (
            <input
              type="text"
              value={echConfig}
              disabled={locked}
              placeholder={t.expert.echConfigPlaceholder}
              onChange={(e) => setEchConfig(e.target.value)}
              spellCheck={false}
              aria-label={t.expert.echConfigPlaceholder}
              className="w-full rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-foreground ring-1 ring-border outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            />
          )}
        </div>
      </FieldRow>

      <FieldRow
        label={t.expert.peerOverride}
        tooltip={t.expert.peerOverrideTooltip}
        aboutLabel={t.advanced.about}
      >
        <input
          type="text"
          dir="ltr"
          value={forcedPeer}
          disabled={locked}
          placeholder={t.expert.peerOverridePlaceholder}
          onChange={(e) => setForcedPeer(e.target.value)}
          spellCheck={false}
          aria-label={t.expert.peerOverride}
          className="w-full rounded-md bg-surface-2 px-2 py-1 text-left font-mono text-xs text-foreground ring-1 ring-border outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        />
      </FieldRow>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {t.expert.verboseLogs}
          <Tooltip>
            <TooltipTrigger aria-label={t.advanced.about(t.expert.verboseLogs)}>
              <Info size={12} />
            </TooltipTrigger>
            <TooltipContent>{t.expert.verboseLogsTooltip}</TooltipContent>
          </Tooltip>
        </div>
        <Switch
          checked={verboseLogs}
          onCheckedChange={setVerboseLogs}
          disabled={locked}
          aria-label={t.expert.verboseLogs}
        />
      </div>
    </div>
  );
}
