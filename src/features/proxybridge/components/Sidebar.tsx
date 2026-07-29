import type { ReactNode } from "react";

export type ProxyBridgeTabId =
  | "proxy-list"
  | "bypass-list"
  | "host-rules"
  | "port-rules"
  | "application-rules";

interface SidebarItem {
  id: ProxyBridgeTabId;
  label: string;
  icon: string;
}

const items: SidebarItem[] = [
  { id: "proxy-list", label: "Proxy List", icon: "🟢" },
  { id: "bypass-list", label: "Bypass List", icon: "🔴" },
  { id: "host-rules", label: "Host Rules", icon: "🌐" },
  { id: "port-rules", label: "Port Rules", icon: "🔌" },
  { id: "application-rules", label: "Application Rules", icon: "📦" },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: ProxyBridgeTabId;
  onSelect: (id: ProxyBridgeTabId) => void;
}): ReactNode {
  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1 border-l p-3">
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
          {item.label}
        </button>
      ))}
    </nav>
  );
}
