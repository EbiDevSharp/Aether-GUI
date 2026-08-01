import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { FieldRow } from "@/components/FieldRow";
import { NoizeProfileToggle } from "@/components/NoizeProfileToggle";
import { EchModeToggle } from "@/components/EchModeToggle";
import { ZeroTrustAuthMethodToggle } from "@/components/ZeroTrustAuthMethodToggle";
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
  const zeroTrustEnabled = useConnectionStore((s) => s.profile.zero_trust_enabled);
  const setZeroTrustEnabled = useConnectionStore((s) => s.setZeroTrustEnabled);
  const zeroTrustTeam = useConnectionStore((s) => s.profile.zero_trust_team);
  const setZeroTrustTeam = useConnectionStore((s) => s.setZeroTrustTeam);
  const zeroTrustAuthMethod = useConnectionStore((s) => s.profile.zero_trust_auth_method);
  const zeroTrustEmail = useConnectionStore((s) => s.profile.zero_trust_email);
  const setZeroTrustEmail = useConnectionStore((s) => s.setZeroTrustEmail);
  const zeroTrustAccessId = useConnectionStore((s) => s.profile.zero_trust_access_id);
  const setZeroTrustAccessId = useConnectionStore((s) => s.setZeroTrustAccessId);
  const zeroTrustAccessSecret = useConnectionStore((s) => s.profile.zero_trust_access_secret);
  const setZeroTrustAccessSecret = useConnectionStore((s) => s.setZeroTrustAccessSecret);
  const zeroTrustAccessToken = useConnectionStore((s) => s.profile.zero_trust_access_token);
  const setZeroTrustAccessToken = useConnectionStore((s) => s.setZeroTrustAccessToken);
  const gatewayEnabled = useConnectionStore((s) => s.profile.gateway_enabled);
  const setGatewayEnabled = useConnectionStore((s) => s.setGatewayEnabled);
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

      <div className="flex flex-col gap-3 rounded-md ring-1 ring-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {t.zeroTrust.toggle}
            <Tooltip>
              <TooltipTrigger aria-label={t.advanced.about(t.zeroTrust.toggle)}>
                <Info size={12} />
              </TooltipTrigger>
              <TooltipContent>{t.zeroTrust.toggleTooltip}</TooltipContent>
            </Tooltip>
          </div>
          <Switch
            checked={zeroTrustEnabled}
            onCheckedChange={setZeroTrustEnabled}
            disabled={locked}
            aria-label={t.zeroTrust.toggle}
          />
        </div>

        {zeroTrustEnabled && (
          <>
            <FieldRow
              label={t.zeroTrust.team}
              tooltip={t.zeroTrust.teamTooltip}
              aboutLabel={t.advanced.about}
            >
              <input
                type="text"
                dir="ltr"
                value={zeroTrustTeam}
                disabled={locked}
                placeholder={t.zeroTrust.teamPlaceholder}
                onChange={(e) => setZeroTrustTeam(e.target.value)}
                spellCheck={false}
                aria-label={t.zeroTrust.team}
                className="w-full rounded-md bg-surface-2 px-2 py-1 text-left font-mono text-xs text-foreground ring-1 ring-border outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              />
            </FieldRow>

            <FieldRow label={t.zeroTrust.authMethod} aboutLabel={t.advanced.about}>
              <ZeroTrustAuthMethodToggle />
            </FieldRow>

            {zeroTrustAuthMethod === "email" && (
              <FieldRow
                label={t.zeroTrust.email}
                tooltip={t.zeroTrust.emailTooltip}
                aboutLabel={t.advanced.about}
              >
                <input
                  type="text"
                  dir="ltr"
                  value={zeroTrustEmail}
                  disabled={locked}
                  placeholder={t.zeroTrust.emailPlaceholder}
                  onChange={(e) => setZeroTrustEmail(e.target.value)}
                  spellCheck={false}
                  aria-label={t.zeroTrust.email}
                  className="w-full rounded-md bg-surface-2 px-2 py-1 text-left font-mono text-xs text-foreground ring-1 ring-border outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                />
              </FieldRow>
            )}

            {zeroTrustAuthMethod === "servicetoken" && (
              <FieldRow
                label={`${t.zeroTrust.accessId} / ${t.zeroTrust.accessSecret}`}
                tooltip={t.zeroTrust.serviceTokenTooltip}
                aboutLabel={t.advanced.about}
              >
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    dir="ltr"
                    value={zeroTrustAccessId}
                    disabled={locked}
                    placeholder={t.zeroTrust.accessId}
                    onChange={(e) => setZeroTrustAccessId(e.target.value)}
                    spellCheck={false}
                    aria-label={t.zeroTrust.accessId}
                    className="w-full rounded-md bg-surface-2 px-2 py-1 text-left font-mono text-xs text-foreground ring-1 ring-border outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  />
                  <input
                    type="password"
                    dir="ltr"
                    value={zeroTrustAccessSecret}
                    disabled={locked}
                    placeholder={t.zeroTrust.accessSecret}
                    onChange={(e) => setZeroTrustAccessSecret(e.target.value)}
                    spellCheck={false}
                    aria-label={t.zeroTrust.accessSecret}
                    className="w-full rounded-md bg-surface-2 px-2 py-1 text-left font-mono text-xs text-foreground ring-1 ring-border outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  />
                </div>
              </FieldRow>
            )}

            {zeroTrustAuthMethod === "accesstoken" && (
              <FieldRow
                label={t.zeroTrust.accessToken}
                tooltip={t.zeroTrust.accessTokenTooltip}
                aboutLabel={t.advanced.about}
              >
                <input
                  type="password"
                  dir="ltr"
                  value={zeroTrustAccessToken}
                  disabled={locked}
                  placeholder={t.zeroTrust.accessTokenPlaceholder}
                  onChange={(e) => setZeroTrustAccessToken(e.target.value)}
                  spellCheck={false}
                  aria-label={t.zeroTrust.accessToken}
                  className="w-full rounded-md bg-surface-2 px-2 py-1 text-left font-mono text-xs text-foreground ring-1 ring-border outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                />
              </FieldRow>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {t.zeroTrust.gateway}
                <Tooltip>
                  <TooltipTrigger aria-label={t.advanced.about(t.zeroTrust.gateway)}>
                    <Info size={12} />
                  </TooltipTrigger>
                  <TooltipContent>{t.zeroTrust.gatewayTooltip}</TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={gatewayEnabled}
                onCheckedChange={setGatewayEnabled}
                disabled={locked}
                aria-label={t.zeroTrust.gateway}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
