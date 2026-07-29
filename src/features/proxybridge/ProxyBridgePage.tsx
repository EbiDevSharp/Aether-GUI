import { useEffect, useState } from "react";
import { useProxyBridgeStore } from "@/store/proxybridge-store";
import { Sidebar, type ProxyBridgeTabId } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { ProxyListTab } from "./tabs/ProxyListTab";
import { BypassListTab } from "./tabs/BypassListTab";
import { HostRulesTab } from "./tabs/HostRulesTab";
import { PortRulesTab } from "./tabs/PortRulesTab";
import { ApplicationRulesTab } from "./tabs/ApplicationRulesTab";

const tabComponents: Record<ProxyBridgeTabId, React.ComponentType> = {
  "proxy-list": ProxyListTab,
  "bypass-list": BypassListTab,
  "host-rules": HostRulesTab,
  "port-rules": PortRulesTab,
  "application-rules": ApplicationRulesTab,
};

export function ProxyBridgePage() {
  const init = useProxyBridgeStore((s) => s.init);
  const loading = useProxyBridgeStore((s) => s.loading);
  const error = useProxyBridgeStore((s) => s.error);
  const [active, setActive] = useState<ProxyBridgeTabId>("proxy-list");

  useEffect(() => {
    init();
  }, [init]);

  const ActiveTab = tabComponents[active];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        در حال بارگذاری تنظیمات ProxyBridge...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" dir="rtl">
      <StatusBar />
      {error && (
        <p className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar active={active} onSelect={setActive} />
        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          <ActiveTab />
        </div>
      </div>
    </div>
  );
}
