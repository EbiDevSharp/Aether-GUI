import { RuleTable } from "../components/RuleTable";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ProxyRule } from "@/types/proxybridge";

export function BypassListTab() {
  const { t } = useLanguage();
  const tt = t.proxybridge.bypassList;

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">{tt.heading}</h2>
        <p className="text-sm text-muted-foreground">{tt.description}</p>
      </div>
      <RuleTable
        title=""
        emphasize="process"
        filter={(r: ProxyRule) => r.Action === "DIRECT"}
        defaultsForNewRule={{ Action: "DIRECT" }}
        emptyHint={tt.emptyHint}
      />
    </div>
  );
}
