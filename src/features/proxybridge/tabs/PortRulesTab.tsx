import { RuleTable } from "../components/RuleTable";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ProxyRule } from "@/types/proxybridge";

export function PortRulesTab() {
  const { t } = useLanguage();
  const tt = t.proxybridge.portRules;

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">{tt.heading}</h2>
        <p className="text-sm text-muted-foreground">{tt.description}</p>
      </div>
      <RuleTable
        title=""
        emphasize="port"
        filter={(r: ProxyRule) => r.TargetPorts !== "*" && r.TargetPorts.trim() !== ""}
        defaultsForNewRule={{ TargetPorts: "" }}
        emptyHint={tt.emptyHint}
      />
    </div>
  );
}
