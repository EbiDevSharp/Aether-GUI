import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { ListChecks } from "lucide-react";
import type { Protocol, ProxyRule, RuleAction } from "@/types/proxybridge";
import { useProxyBridgeStore } from "@/store/proxybridge-store";
import { ProcessPickerDialog } from "./ProcessPickerDialog";

interface RuleFormDialogProps {
  index?: number; // اگه تعریف شده باشه یعنی ویرایش، وگرنه ساخت جدید
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
          {index !== undefined ? "ویرایش قانون" : "قانون جدید"}
        </h3>

        <div className="space-y-3">
          <Field label="برنامه (Process)" hint="مثال: *  یا  chrome.exe  یا  steam*.exe">
            <div className="flex gap-2">
              <input
                className="input"
                value={form.ProcessName}
                onChange={(e) => setForm((f) => ({ ...f, ProcessName: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowProcessPicker(true)}
                title="انتخاب از برنامه‌های در حال اجرا"
                className="btn-secondary flex shrink-0 items-center gap-1"
              >
                <ListChecks size={14} />
                در حال اجرا
              </button>
              <button
                type="button"
                onClick={handleBrowse}
                title="انتخاب فایل exe از دیسک"
                className="btn-secondary shrink-0"
              >
                فایل...
              </button>
            </div>
          </Field>

          <Field label="هاست مقصد" hint="مثال: *  یا  192.168.*.*  یا  10.0.0.1-10.0.0.255">
            <input
              className="input"
              value={form.TargetHosts}
              onChange={(e) => setForm((f) => ({ ...f, TargetHosts: e.target.value }))}
            />
          </Field>

          <Field label="پورت مقصد" hint="مثال: *  یا  80; 443  یا  1000-2000">
            <input
              className="input"
              value={form.TargetPorts}
              onChange={(e) => setForm((f) => ({ ...f, TargetPorts: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="پروتکل">
              <select
                className="input"
                value={form.Protocol}
                onChange={(e) =>
                  setForm((f) => ({ ...f, Protocol: e.target.value as Protocol }))
                }
              >
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
                <option value="BOTH">هردو</option>
              </select>
            </Field>

            <Field label="عملیات">
              <select
                className="input"
                value={form.Action}
                onChange={(e) =>
                  setForm((f) => ({ ...f, Action: e.target.value as RuleAction }))
                }
              >
                <option value="DIRECT">DIRECT — مستقیم</option>
                <option value="BLOCK">BLOCK — مسدود</option>
                <option value="PROXY">PROXY — از طریق پراکسی</option>
              </select>
            </Field>
          </div>

          {form.Action === "PROXY" && (
            <Field label="کدوم سرور پراکسی؟">
              {proxyConfigs.length === 0 ? (
                <p className="text-xs text-amber-600">
                  اول از تب «Proxy List» یک سرور پراکسی اضافه کن.
                </p>
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
                  <option value="">(اولین موجود به‌صورت خودکار)</option>
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
            فعال باشه
          </label>
        </div>

        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            انصراف
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "در حال ذخیره..." : "ذخیره"}
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
