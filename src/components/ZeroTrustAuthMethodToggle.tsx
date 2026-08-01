import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useConnectionStore } from "@/state/connectionStore";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ZeroTrustAuthMethod } from "@/types/connection";

/** Three ways Aether ≥1.5.0 can sign in to a Zero Trust team (`--team`):
 * Email (`--access-email`, interactive one-time code), Service Token
 * (`--access-id` + `--access-secret`, for headless/CI use), and Access
 * Token (`--access-token`, a JWT already obtained elsewhere). Which
 * additional field(s) show up below this toggle is decided in
 * ExpertTab.tsx, same split as EchModeToggle/ExpertTab's "custom" field. */
export function ZeroTrustAuthMethodToggle() {
  const status = useConnectionStore((s) => s.status);
  const method = useConnectionStore((s) => s.profile.zero_trust_auth_method);
  const setMethod = useConnectionStore((s) => s.setZeroTrustAuthMethod);
  const { t } = useLanguage();

  const locked = status.state !== "Idle" && status.state !== "Error";
  const labels: Record<ZeroTrustAuthMethod, string> = {
    email: t.zeroTrust.authEmail,
    servicetoken: t.zeroTrust.authServiceToken,
    accesstoken: t.zeroTrust.authAccessToken,
  };

  return (
    <ToggleGroup
      type="single"
      value={method}
      onValueChange={(v) => {
        if (v) setMethod(v as ZeroTrustAuthMethod);
      }}
      disabled={locked}
      className="w-full gap-0 rounded-full bg-muted p-1 ring-1 ring-border"
    >
      {(Object.keys(labels) as ZeroTrustAuthMethod[]).map((m) => (
        <ToggleGroupItem
          key={m}
          value={m}
          size="sm"
          aria-label={labels[m]}
          className="flex-1 rounded-full text-muted-foreground transition-colors duration-75 data-[state=on]:bg-primary/85 data-[state=on]:text-primary-foreground"
        >
          {labels[m]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
