import { RuleTable } from "../components/RuleTable";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ProxyRule } from "@/types/proxybridge";

export function ApplicationRulesTab() {
  const { t } = useLanguage();
  const tt = t.proxybridge.applicationRules;

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">{tt.heading}</h2>
        <p className="text-sm text-muted-foreground">{tt.description}</p>
      </div>
      <RuleTable
        title=""
        emphasize="process"
        filter={(r: ProxyRule) => r.ProcessName !== "*" && r.ProcessName.trim() !== ""}
        defaultsForNewRule={{ ProcessName: "" }}
        emptyHint={tt.emptyHint}
      />
    </div>
  );
}
