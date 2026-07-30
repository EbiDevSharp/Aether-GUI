import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useProxyBridgeStore } from "@/store/proxybridge-store";
import { useLanguage } from "@/i18n/LanguageContext";
import { ProxyConfigFormDialog } from "../components/ProxyConfigFormDialog";
import type { ProxyConfig } from "@/types/proxybridge";

export function ProxyListTab() {
  const configs = useProxyBridgeStore((s) => s.profile?.ProxyConfigs ?? []);
  const deleteProxyConfig = useProxyBridgeStore((s) => s.deleteProxyConfig);
  const [editing, setEditing] = useState<ProxyConfig | null>(null);
  const [creating, setCreating] = useState(false);
  const { t } = useLanguage();
  const tt = t.proxybridge.proxyList;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">{tt.heading}</h2>
          <p className="text-sm text-muted-foreground">{tt.description}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          {tt.newServer}
        </button>
      </div>

      {configs.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {tt.empty}
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-start">
              <tr>
                <th className="px-3 py-2 font-medium">{tt.colId}</th>
                <th className="px-3 py-2 font-medium">{tt.colType}</th>
                <th className="px-3 py-2 font-medium">{tt.colAddress}</th>
                <th className="px-3 py-2 font-medium">{tt.colAuth}</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.Id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">#{c.Id}</td>
                  <td className="px-3 py-2 uppercase">{c.Type}</td>
                  <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                    {c.Host}:{c.Port}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.Username ? tt.userPrefix(c.Username) : tt.noAuth}
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
