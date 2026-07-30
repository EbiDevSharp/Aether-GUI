import { useState } from "react";
import type { ProxyConfig, ProxyType } from "@/types/proxybridge";
import { useProxyBridgeStore } from "@/store/proxybridge-store";
import { proxyBridgeApi } from "@/lib/proxybridge-api";
import { useConnectionStore } from "@/state/connectionStore";
import { useLanguage } from "@/i18n/LanguageContext";

interface ProxyConfigFormDialogProps {
  initial?: ProxyConfig;
  onClose: () => void;
}

export function ProxyConfigFormDialog({ initial, onClose }: ProxyConfigFormDialogProps) {
  // Aether's own local SOCKS5 port (Advanced → Local Port, default 1819).
  // Used to default/sync new proxy-server entries here so ProxyBridge
  // points at whatever port Aether is actually listening on, instead of a
  // stale hardcoded 1080.
  const aetherLocalPort = useConnectionStore((s) => s.profile.local_port);

  const [form, setForm] = useState<Omit<ProxyConfig, "Id">>(
    initial ?? {
      Type: "socks5",
      Host: "127.0.0.1",
      Port: String(aetherLocalPort),
      Username: "",
      Password: "",
    },
  );
  const addProxyConfig = useProxyBridgeStore((s) => s.addProxyConfig);
  const updateProxyConfig = useProxyBridgeStore((s) => s.updateProxyConfig);
  const { t } = useLanguage();
  const tt = t.proxybridge.proxyConfigForm;

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
          {initial ? tt.editTitle : tt.newTitle}
        </h3>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{tt.type}</span>
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
              <span className="mb-1 block font-medium">{tt.host}</span>
              <input
                className="input"
                dir="ltr"
                value={form.Host}
                onChange={(e) => setForm((f) => ({ ...f, Host: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{tt.port}</span>
              <input
                className="input"
                dir="ltr"
                value={form.Port}
                onChange={(e) => setForm((f) => ({ ...f, Port: e.target.value }))}
              />
            </label>
          </div>

          {/* Only makes sense for a local SOCKS5 hop into Aether itself —
              an HTTP config or a remote host has nothing to do with
              Aether's local port. */}
          {form.Type === "socks5" && form.Host === "127.0.0.1" && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, Port: String(aetherLocalPort) }))}
              className="text-xs text-primary hover:underline"
            >
              {tt.useAetherPort(aetherLocalPort)}
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{tt.username}</span>
              <input
                className="input"
                dir="ltr"
                value={form.Username}
                onChange={(e) => setForm((f) => ({ ...f, Username: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{tt.password}</span>
              <input
                type="password"
                className="input"
                dir="ltr"
                value={form.Password}
                onChange={(e) => setForm((f) => ({ ...f, Password: e.target.value }))}
              />
            </label>
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{tt.testSection}</p>
            <div className="flex gap-2">
              <input
                className="input"
                dir="ltr"
                placeholder={tt.testHostPlaceholder}
                value={testHost}
                onChange={(e) => setTestHost(e.target.value)}
              />
              <input
                className="input w-20"
                dir="ltr"
                placeholder={tt.testPortPlaceholder}
                value={testPort}
                onChange={(e) => setTestPort(e.target.value)}
              />
              <button onClick={handleTest} disabled={testing} className="btn-secondary shrink-0">
                {testing ? tt.testing : tt.testButton}
              </button>
            </div>
            {testResult && <p className="mt-2 text-xs">{testResult}</p>}
          </div>
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
    </div>
  );
}
