import { RuleTable } from "../components/RuleTable";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ProxyRule } from "@/types/proxybridge";

export function HostRulesTab() {
  const { t } = useLanguage();
  const tt = t.proxybridge.hostRules;

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">{tt.heading}</h2>
        <p className="text-sm text-muted-foreground">{tt.description}</p>
      </div>
      <RuleTable
        title=""
        emphasize="host"
        filter={(r: ProxyRule) => r.TargetHosts !== "*" && r.TargetHosts.trim() !== ""}
        defaultsForNewRule={{ TargetHosts: "" }}
        emptyHint={tt.emptyHint}
      />
    </div>
  );
}
