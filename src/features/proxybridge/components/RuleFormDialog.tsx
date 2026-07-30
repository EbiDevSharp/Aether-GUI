import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { ListChecks } from "lucide-react";
import type { Protocol, ProxyRule, RuleAction } from "@/types/proxybridge";
import { useProxyBridgeStore } from "@/store/proxybridge-store";
import { useLanguage } from "@/i18n/LanguageContext";
import { ProcessPickerDialog } from "./ProcessPickerDialog";

interface RuleFormDialogProps {
  index?: number; // defined => editing, otherwise creating a new rule
  initial?: Partial<ProxyRule>;
  onClose: () => void;
}

const emptyRule: ProxyRule = {
  ProcessName: "*",
  TargetHosts: "*",
  TargetPorts: "*",
  Protocol: "TCP",
  Action: "DIRECT",
  IsEnabled: true,
  ProxyConfigId: null,
};

export function RuleFormDialog({ index, initial, onClose }: RuleFormDialogProps) {
  const [form, setForm] = useState<ProxyRule>({ ...emptyRule, ...initial });
  const proxyConfigs = useProxyBridgeStore((s) => s.profile?.ProxyConfigs ?? []);
  const addRule = useProxyBridgeStore((s) => s.addRule);
  const updateRule = useProxyBridgeStore((s) => s.updateRule);
  const { t } = useLanguage();
  const tt = t.proxybridge.ruleForm;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showProcessPicker, setShowProcessPicker] = useState(false);

  async function handleBrowse() {
    const selected = await open({
      multiple: false,
      filters:
        window.navigator.userAgent.includes("Windows")
          ? [{ name: "Executable", extensions: ["exe"] }]
          : undefined,
    });
    if (typeof selected === "string") {
      const name = selected.split(/[/\\]/).pop() ?? selected;
      setForm((f) => ({ ...f, ProcessName: name }));
    }
  }

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      if (index !== undefined) {
        await updateRule(index, form);
      } else {
        await addRule(form);
      }
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl">
        <h3 className="mb-4 text-base font-medium">
          {index !== undefined ? tt.editTitle : tt.newTitle}
        </h3>

        <div className="space-y-3">
          <Field label={tt.process} hint={tt.processHint}>
            <div className="flex gap-2">
              <input
                className="input"
                dir="ltr"
                value={form.ProcessName}
                onChange={(e) => setForm((f) => ({ ...f, ProcessName: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowProcessPicker(true)}
                title={tt.pickFromRunning}
                className="btn-secondary flex shrink-0 items-center gap-1"
              >
                <ListChecks size={14} />
                {tt.running}
              </button>
              <button
                type="button"
                onClick={handleBrowse}
                title={tt.pickExeFile}
                className="btn-secondary shrink-0"
              >
                {tt.browseFile}
              </button>
            </div>
          </Field>

          <Field label={tt.targetHost} hint={tt.targetHostHint}>
            <input
              className="input"
              dir="ltr"
              value={form.TargetHosts}
              onChange={(e) => setForm((f) => ({ ...f, TargetHosts: e.target.value }))}
            />
          </Field>

          <Field label={tt.targetPort} hint={tt.targetPortHint}>
            <input
              className="input"
              dir="ltr"
              value={form.TargetPorts}
              onChange={(e) => setForm((f) => ({ ...f, TargetPorts: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={tt.protocol}>
              <select
                className="input"
                value={form.Protocol}
                onChange={(e) =>
                  setForm((f) => ({ ...f, Protocol: e.target.value as Protocol }))
                }
              >
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
                <option value="BOTH">{tt.both}</option>
              </select>
            </Field>

            <Field label={tt.actionLabel}>
              <select
                className="input"
                value={form.Action}
                onChange={(e) =>
                  setForm((f) => ({ ...f, Action: e.target.value as RuleAction }))
                }
              >
                <option value="DIRECT">{tt.directOption}</option>
                <option value="BLOCK">{tt.blockOption}</option>
                <option value="PROXY">{tt.proxyOption}</option>
              </select>
            </Field>
          </div>

          {form.Action === "PROXY" && (
            <Field label={tt.whichServer}>
              {proxyConfigs.length === 0 ? (
                <p className="text-xs text-amber-600">{tt.noServersHint}</p>
              ) : (
                <select
                  className="input"
                  value={form.ProxyConfigId ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      ProxyConfigId: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">{tt.autoFirst}</option>
                  {proxyConfigs.map((c) => (
                    <option key={c.Id} value={c.Id}>
                      #{c.Id} — {c.Type.toUpperCase()} {c.Host}:{c.Port}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.IsEnabled}
              onChange={(e) => setForm((f) => ({ ...f, IsEnabled: e.target.checked }))}
            />
            {tt.enabled}
          </label>
        </div>

        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            {tt.cancel}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? tt.saving : tt.save}
          </button>
        </div>
      </div>

      {showProcessPicker && (
        <ProcessPickerDialog
          onSelect={(name) => setForm((f) => ({ ...f, ProcessName: name }))}
          onClose={() => setShowProcessPicker(false)}
        />
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
