import { useState } from "react";
import type { ProxyConfig, ProxyType } from "@/types/proxybridge";
import { useProxyBridgeStore } from "@/store/proxybridge-store";
import { proxyBridgeApi } from "@/lib/proxybridge-api";

interface ProxyConfigFormDialogProps {
  initial?: ProxyConfig;
  onClose: () => void;
}

const empty: Omit<ProxyConfig, "Id"> = {
  Type: "socks5",
  Host: "127.0.0.1",
  Port: "1080",
  Username: "",
  Password: "",
};

export function ProxyConfigFormDialog({ initial, onClose }: ProxyConfigFormDialogProps) {
  const [form, setForm] = useState<Omit<ProxyConfig, "Id">>(initial ?? empty);
  const addProxyConfig = useProxyBridgeStore((s) => s.addProxyConfig);
  const updateProxyConfig = useProxyBridgeStore((s) => s.updateProxyConfig);

  const [testHost, setTestHost] = useState("google.com");
  const [testPort, setTestPort] = useState("80");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const configForTest: ProxyConfig = { Id: initial?.Id ?? 0, ...form };
      const result = await proxyBridgeApi.testProxyConnection(
        configForTest,
        testHost,
        Number(testPort),
      );
      setTestResult(`✅ ${result}`);
    } catch (e) {
      setTestResult(`❌ ${String(e)}`);
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      if (initial) {
        await updateProxyConfig({ ...initial, ...form });
      } else {
        await addProxyConfig(form);
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
          {initial ? "ویرایش سرور پراکسی" : "سرور پراکسی جدید"}
        </h3>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">نوع</span>
            <select
              className="input"
              value={form.Type}
              onChange={(e) => setForm((f) => ({ ...f, Type: e.target.value as ProxyType }))}
            >
              <option value="socks5">SOCKS5</option>
              <option value="http">HTTP</option>
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-2 block text-sm">
              <span className="mb-1 block font-medium">هاست</span>
              <input
                className="input"
                value={form.Host}
                onChange={(e) => setForm((f) => ({ ...f, Host: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">پورت</span>
              <input
                className="input"
                value={form.Port}
                onChange={(e) => setForm((f) => ({ ...f, Port: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">یوزرنیم (اختیاری)</span>
              <input
                className="input"
                value={form.Username}
                onChange={(e) => setForm((f) => ({ ...f, Username: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">پسورد (اختیاری)</span>
              <input
                type="password"
                className="input"
                value={form.Password}
                onChange={(e) => setForm((f) => ({ ...f, Password: e.target.value }))}
              />
            </label>
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              تست اتصال (مستقل از اجرای اصلی ProxyBridge)
            </p>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="مقصد (host)"
                value={testHost}
                onChange={(e) => setTestHost(e.target.value)}
              />
              <input
                className="input w-20"
                placeholder="پورت"
                value={testPort}
                onChange={(e) => setTestPort(e.target.value)}
              />
              <button onClick={handleTest} disabled={testing} className="btn-secondary shrink-0">
                {testing ? "..." : "تست"}
              </button>
            </div>
            {testResult && <p className="mt-2 text-xs">{testResult}</p>}
          </div>
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
    </div>
  );
}
