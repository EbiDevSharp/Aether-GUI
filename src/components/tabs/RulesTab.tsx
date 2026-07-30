import { ProxyBridgePage } from "@/features/proxybridge/ProxyBridgePage";

/**
 * The "Rules" tab — this used to be its own popped-out window ("Proxy
 * Bridge (Proxy List / Rules)", opened via a WebviewWindow from App.tsx).
 * It's a first-class part of the main GUI now: same window, same tab bar,
 * no separate "Proxy Bridge" identity for the user to keep track of. The
 * page itself is unchanged (its own StatusBar + Sidebar + rule tables) —
 * only the chrome around it moved.
 */
export function RulesTab() {
  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <ProxyBridgePage />
    </div>
  );
}
