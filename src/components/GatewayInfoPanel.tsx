import { useEffect, useState } from "react";
import { ChevronDown, Network } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useConnectionStore } from "@/state/connectionStore";
import { useLanguage } from "@/i18n/LanguageContext";
import type { GatewayInfoEntry, WarpIdentity } from "@/types/connection";

/**
 * Aggregates the "[+] selected ..." / "[+] using ..." lines Aether logs
 * once it settles on how it's actually connecting (see aether/prompts.rs
 * upstream) into a small readable list, instead of making the user dig
 * through the raw Logs accordion in Advanced for them. Rendered right
 * under the elapsed-time line in ConnectionStatusLine, closed by default
 * like Advanced/Expert. Renders nothing if no such line has been seen yet
 * — a future Aether wording change would just mean an empty list, not a
 * crash, since nothing here assumes all four patterns exist every time.
 *
 * Also shows the WARP-assigned tunnel addresses and Cloudflare's WireGuard
 * peer public key (commands.rs::get_warp_identity), read once per
 * connection straight from Aether's own persisted identity file rather
 * than parsed from logs — Aether never prints these to stdout.
 */
export function GatewayInfoPanel() {
  const entries = useConnectionStore((s) => s.connectionInfo);
  const status = useConnectionStore((s) => s.status);
  const protocol = useConnectionStore((s) => s.profile.protocol);
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<WarpIdentity | null>(null);

  useEffect(() => {
    if (status.state !== "Connected") {
      setIdentity(null);
      return;
    }
    invoke<WarpIdentity | null>("get_warp_identity", { protocol })
      .then(setIdentity)
      .catch((e) => console.error("Failed to read WARP identity:", e));
  }, [status.state, protocol]);

  if (entries.length === 0 && !identity) return null;

  function kindLabel(kind: GatewayInfoEntry["kind"]): string {
    switch (kind) {
      case "masque":
        return t.gatewayInfo.masque;
      case "wireguard":
        return t.gatewayInfo.wireguard;
      case "cloudflare":
        return t.gatewayInfo.cloudflareEdge;
      case "forced":
        return t.gatewayInfo.forcedPeer;
      case "masque_cached":
        return t.gatewayInfo.masqueCached;
      case "wireguard_cached":
        return t.gatewayInfo.wireguardCached;
    }
  }

  return (
    <div className="w-full max-w-xs">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-center gap-1.5 py-1 text-[11px] text-muted-foreground/70 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary rounded-md">
          <Network size={11} />
          {t.gatewayInfo.toggle}
          <ChevronDown
            size={11}
            className="transition-transform duration-150 data-[state=open]:rotate-180"
            data-state={open ? "open" : "closed"}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:duration-150 data-[state=open]:[animation-timing-function:cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100">
          {/* Addresses/ports/RTT read naturally left-to-right even in the
           * Persian UI — same reasoning as the Local Port/LAN Port/Peer
           * Override fields in Advanced/Expert. */}
          <div
            dir="ltr"
            className="mt-1 flex flex-col gap-1 rounded-md bg-surface-1 p-2 text-left font-mono text-[11px] text-muted-foreground ring-1 ring-border"
          >
            {entries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="shrink-0">{kindLabel(entry.kind)}</span>
                <span className="truncate text-foreground">
                  {entry.address}
                  {entry.rtt && (
                    <span className="text-muted-foreground"> · {t.gatewayInfo.rtt} {entry.rtt}</span>
                  )}
                </span>
              </div>
            ))}
            {identity && (entries.length > 0 || identity.ipv4 || identity.ipv6) && (
              <div className="mt-0.5 border-t border-border pt-1">
                {identity.ipv4 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="shrink-0">{t.gatewayInfo.warpIpv4}</span>
                    <span className="truncate text-foreground">{identity.ipv4}</span>
                  </div>
                )}
                {identity.ipv6 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="shrink-0">{t.gatewayInfo.warpIpv6}</span>
                    <span className="truncate text-foreground">{identity.ipv6}</span>
                  </div>
                )}
                {identity.wg_peer_public_key && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="shrink-0">{t.gatewayInfo.peerPublicKey}</span>
                    <span className="truncate text-foreground">{identity.wg_peer_public_key}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
