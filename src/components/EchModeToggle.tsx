import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useConnectionStore } from "@/state/connectionStore";
import { useLanguage } from "@/i18n/LanguageContext";
import type { EchMode } from "@/types/connection";

/** Locked outside Idle/Error, mirroring ProtocolSelect. The "Custom" config
 * text field itself lives in AdvancedPanel.tsx, shown conditionally when
 * this is set to "custom" — kept out of this component so it stays a
 * simple three-way toggle like its siblings. */
export function EchModeToggle() {
  const status = useConnectionStore((s) => s.status);
  const echMode = useConnectionStore((s) => s.profile.ech_mode);
  const setEchMode = useConnectionStore((s) => s.setEchMode);
  const { t } = useLanguage();

  const locked = status.state !== "Idle" && status.state !== "Error";
  const labels: Record<EchMode, string> = {
    off: t.ech.off,
    auto: t.ech.auto,
    custom: t.ech.custom,
  };

  return (
    <ToggleGroup
      type="single"
      value={echMode}
      onValueChange={(v) => {
        if (v) setEchMode(v as EchMode);
      }}
      disabled={locked}
      className="w-full gap-0 rounded-full bg-black/20 p-1 ring-1 ring-white/10"
    >
      {(Object.keys(labels) as EchMode[]).map((mode) => (
        <ToggleGroupItem
          key={mode}
          value={mode}
          size="sm"
          aria-label={labels[mode]}
          className="flex-1 rounded-full text-muted-foreground transition-colors duration-75 data-[state=on]:bg-primary/85 data-[state=on]:text-primary-foreground"
        >
          {labels[mode]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
