import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useProxyBridgeStore } from "@/store/proxybridge-store";
import { ProxyConfigFormDialog } from "../components/ProxyConfigFormDialog";
import type { ProxyConfig } from "@/types/proxybridge";

export function ProxyListTab() {
  const configs = useProxyBridgeStore((s) => s.profile?.ProxyConfigs ?? []);
  const deleteProxyConfig = useProxyBridgeStore((s) => s.deleteProxyConfig);
  const [editing, setEditing] = useState<ProxyConfig | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">🟢 Proxy List</h2>
          <p className="text-sm text-muted-foreground">
            سرورهای SOCKS5 / HTTP که Ruleها می‌تونن بهشون اشاره کنن. تا ۱۶ سرور همزمان.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          + سرور پراکسی جدید
        </button>
      </div>

      {configs.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          هنوز سروری اضافه نشده. برای این‌که Ruleهای Action=PROXY کار کنن، اول یک سرور اضافه کن.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-right">
              <tr>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">نوع</th>
                <th className="px-3 py-2 font-medium">آدرس</th>
                <th className="px-3 py-2 font-medium">احراز هویت</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.Id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">#{c.Id}</td>
                  <td className="px-3 py-2 uppercase">{c.Type}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {c.Host}:{c.Port}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.Username ? `کاربر: ${c.Username}` : "بدون احراز هویت"}
                  </td>
                  <td className="flex gap-2 px-3 py-2">
                    <button
                      onClick={() => setEditing(c)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteProxyConfig(c.Id)}
                      className="text-destructive hover:opacity-80"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <ProxyConfigFormDialog onClose={() => setCreating(false)} />}
      {editing && (
        <ProxyConfigFormDialog initial={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
