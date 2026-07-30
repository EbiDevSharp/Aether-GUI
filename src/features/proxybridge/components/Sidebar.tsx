import type { ReactNode } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

export type ProxyBridgeTabId =
  | "proxy-list"
  | "bypass-list"
  | "host-rules"
  | "port-rules"
  | "application-rules";

interface SidebarItem {
  id: ProxyBridgeTabId;
  icon: string;
}

const items: SidebarItem[] = [
  { id: "proxy-list", icon: "🟢" },
  { id: "bypass-list", icon: "🔴" },
  { id: "host-rules", icon: "🌐" },
  { id: "port-rules", icon: "🔌" },
  { id: "application-rules", icon: "📦" },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: ProxyBridgeTabId;
  onSelect: (id: ProxyBridgeTabId) => void;
}): ReactNode {
  const { t } = useLanguage();
  const labels: Record<ProxyBridgeTabId, string> = {
    "proxy-list": t.proxybridge.sidebar.proxyList,
    "bypass-list": t.proxybridge.sidebar.bypassList,
    "host-rules": t.proxybridge.sidebar.hostRules,
    "port-rules": t.proxybridge.sidebar.portRules,
    "application-rules": t.proxybridge.sidebar.applicationRules,
  };

  return (
    // border-e (logical) instead of border-l: sits on the side facing the
    // content in both directions, so it doesn't end up on the wrong edge
    // when the page flips to rtl for Persian.
    <nav className="flex w-52 shrink-0 flex-col gap-1 border-e p-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
            active === item.id
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <span>{item.icon}</span>
          {labels[item.id]}
        </button>
      ))}
    </nav>
  );
}
