import { Info, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProxyBridgeStore } from "@/store/proxybridge-store";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Quick on/off for the Rules engine (ProxyBridge/WinDivert) right on the
 * Connect screen, next to System Proxy — so turning per-app/host/port
 * routing on or off doesn't require a trip to the Rules tab.
 *
 * Deliberately independent of both other controls on this screen:
 * - System Proxy only affects apps that read Windows' system proxy
 *   setting (browsers, mostly).
 * - This toggle drives the WinDivert-based engine that applies the Rules
 *   tab's per-process/host/port rules to *every* app, proxy-aware or not.
 * - The Connect button is Aether's tunnel itself; the Rules engine can be
 *   on/off regardless of whether Aether is connected (e.g. a BLOCK rule
 *   for a specific app doesn't need a tunnel at all).
 *
 * Mirrors StatusBar.tsx's start/stop/relaunchElevated logic, just
 * condensed into a single switch instead of a button whose label changes.
 */
export function BridgeToggle() {
  const status = useProxyBridgeStore((s) => s.status);
  const error = useProxyBridgeStore((s) => s.error);
  const start = useProxyBridgeStore((s) => s.start);
  const stop = useProxyBridgeStore((s) => s.stop);
  const relaunchElevated = useProxyBridgeStore((s) => s.relaunchElevated);
  const { t } = useLanguage();

  const isRunning = status === "running" || status === "starting";
  const isBusy = status === "starting" || status === "stopping";
  const needsElevation = status === "needsElevation";

  function handleChange(next: boolean) {
    if (!next) {
      void stop();
      return;
    }
    if (needsElevation) {
      // Restarts the whole app elevated (Windows shows its own UAC prompt) —
      // see proxybridge/elevate.rs::relaunch_elevated. Not reversible from
      // here; the current process exits once the elevated one launches.
      void relaunchElevated();
      return;
    }
    void start();
  }

  const tooltip = needsElevation
    ? t.bridgeToggle.needsElevationTooltip
    : status === "error" && error
      ? t.bridgeToggle.errorTooltip(error)
      : t.bridgeToggle.tooltip;

  return (
    <div className="flex items-center gap-2 rounded-full bg-surface-2/60 px-3 py-1.5 ring-1 ring-border">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {needsElevation && <ShieldAlert size={12} className="text-amber-500" />}
        {t.bridgeToggle.label}
        <Tooltip>
          <TooltipTrigger aria-label={t.advanced.about(t.bridgeToggle.label)}>
            <Info size={12} />
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </span>
      <Switch
        checked={isRunning}
        disabled={isBusy}
        onCheckedChange={handleChange}
        aria-label={t.bridgeToggle.label}
      />
    </div>
  );
}
