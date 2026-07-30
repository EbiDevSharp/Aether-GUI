import { useMemo, useState } from "react";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import type { ProxyRule } from "@/types/proxybridge";
import { useProxyBridgeStore } from "@/store/proxybridge-store";
import { useLanguage } from "@/i18n/LanguageContext";
import { RuleFormDialog } from "./RuleFormDialog";

export type RuleFilter = (rule: ProxyRule) => boolean;

interface RuleTableProps {
  /** Filters which rules show up in this tab (doesn't touch the real data). */
  filter?: RuleFilter;
  /** Which column to show first/highlighted: process | host | port | action */
  emphasize?: "process" | "host" | "port" | "action";
  /** Default value when creating a new rule from this tab (e.g. Bypass always starts as Action=DIRECT). */
  defaultsForNewRule?: Partial<ProxyRule>;
  title: string;
  emptyHint: string;
}

export function RuleTable({
  filter,
  emphasize = "process",
  defaultsForNewRule,
  title,
  emptyHint,
}: RuleTableProps) {
  const rules = useProxyBridgeStore((s) => s.profile?.ProxyRules ?? []);
  const proxyConfigs = useProxyBridgeStore((s) => s.profile?.ProxyConfigs ?? []);
  const deleteRule = useProxyBridgeStore((s) => s.deleteRule);
  const reorderRule = useProxyBridgeStore((s) => s.reorderRule);
  const { t } = useLanguage();
  const tt = t.proxybridge.ruleTable;

  const [editing, setEditing] = useState<{ index: number; rule: ProxyRule } | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // We keep the real index because delete/update act on the index of the
  // full array, not the filtered index of this tab.
  const rows = useMemo(
    () =>
      rules
        .map((rule, index) => ({ rule, index }))
        .filter(({ rule }) => (filter ? filter(rule) : true)),
    [rules, filter],
  );

  const columnOrder: Array<"process" | "host" | "port" | "action"> = [
    emphasize,
    ...(["process", "host", "port", "action"] as const).filter((c) => c !== emphasize),
  ];

  const columnLabel: Record<string, string> = {
    process: tt.colProcess,
    host: tt.colHost,
    port: tt.colPort,
    action: tt.colAction,
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          {tt.newRule}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-start">
              <tr>
                <th className="w-8"></th>
                {columnOrder.map((c) => (
                  <th key={c} className="px-3 py-2 font-medium">
                    {columnLabel[c]}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">{tt.colProtocol}</th>
                <th className="px-3 py-2 font-medium">{tt.colEnabled}</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ rule, index }, rowIdx) => (
                <tr
                  key={index}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== index) {
                      reorderRule(dragIndex, index);
                    }
                    setDragIndex(null);
                  }}
                  className={`border-t ${rowIdx === 0 ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}
                >
                  <td className="cursor-grab px-2 text-muted-foreground">
                    <GripVertical size={14} />
                  </td>
                  {columnOrder.map((c) => (
                    <td key={c} className="px-3 py-2 font-mono text-xs" dir="ltr">
                      {c === "process" && (rule.ProcessName || "*")}
                      {c === "host" && (rule.TargetHosts || "*")}
                      {c === "port" && (rule.TargetPorts || "*")}
                      {c === "action" && (
                        <ActionBadge rule={rule} proxyConfigs={proxyConfigs} tt={tt} />
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2">{rule.Protocol}</td>
                  <td className="px-3 py-2">{rule.IsEnabled ? tt.yes : tt.no}</td>
                  <td className="flex gap-2 px-3 py-2">
                    <button
                      onClick={() => setEditing({ index, rule })}
                      className="text-muted-foreground hover:text-foreground"
                      title={tt.edit}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteRule(index)}
                      className="text-destructive hover:opacity-80"
                      title={tt.delete}
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

      <p className="text-xs text-muted-foreground">{tt.orderNote}</p>

      {creating && (
        <RuleFormDialog
          initial={defaultsForNewRule}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <RuleFormDialog
          index={editing.index}
          initial={editing.rule}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ActionBadge({
  rule,
  proxyConfigs,
  tt,
}: {
  rule: ProxyRule;
  proxyConfigs: { Id: number; Host: string; Port: string }[];
  tt: { firstAvailableConfig: string };
}) {
  if (rule.Action === "PROXY") {
    const cfg = proxyConfigs.find((c) => c.Id === rule.ProxyConfigId);
    return (
      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
        PROXY {cfg ? `(${cfg.Host}:${cfg.Port})` : tt.firstAvailableConfig}
      </span>
    );
  }
  if (rule.Action === "BLOCK") {
    return (
      <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-800 dark:bg-red-950 dark:text-red-300">
        BLOCK
      </span>
    );
  }
  return (
    <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-950 dark:text-green-300">
      DIRECT
    </span>
  );
}
