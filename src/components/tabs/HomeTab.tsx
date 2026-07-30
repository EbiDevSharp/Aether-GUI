import { ConnectButton } from "@/components/ConnectButton";
import { ConnectionStatusLine } from "@/components/ConnectionStatusLine";
import { SystemProxyToggle } from "@/components/SystemProxyToggle";
import { BridgeToggle } from "@/components/BridgeToggle";

/**
 * The "Connect" tab — the app's original single-screen default (Connect
 * button, status line, System Proxy chip), now just one tab among several
 * instead of the whole window with Advanced/Expert stacked as accordions
 * underneath it. BridgeToggle sits right under System Proxy — same visual
 * family, same "standing preference, not tied to Connect state" idea — so
 * flipping the Rules engine on/off doesn't require a trip to the Rules tab.
 */
export function HomeTab() {
  return (
    <div className="relative z-10 flex h-full flex-col overflow-y-auto">
      {/* justify-[safe_center] instead of justify-center: centers the group
       * while it fits the viewport, but falls back to start-alignment the
       * moment content overflows instead of centering into it (see the
       * original App.tsx MainScreen this was extracted from). */}
      <div className="flex min-h-full w-full flex-col items-center justify-[safe_center] gap-5 px-6 py-5">
        <div className="flex flex-col items-center gap-3">
          <ConnectButton />
          <ConnectionStatusLine />
          <SystemProxyToggle />
          <BridgeToggle />
        </div>
      </div>
    </div>
  );
}
