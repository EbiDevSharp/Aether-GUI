import { RuleTable } from "../components/RuleTable";
import type { ProxyRule } from "@/types/proxybridge";

export function PortRulesTab() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">🔌 Port Rules</h2>
        <p className="text-sm text-muted-foreground">
          قوانینی که تمرکزشون روی پورت یا بازه‌ی پورت مقصده (مثلاً همه‌ی ترافیک روی
          443 یا بازه‌ی 1000-2000). این‌ها همون Rule های اصلی هستن، فقط بر اساس
          TargetPorts مشخص فیلتر شدن.
        </p>
      </div>
      <RuleTable
        title=""
        emphasize="port"
        filter={(r: ProxyRule) => r.TargetPorts !== "*" && r.TargetPorts.trim() !== ""}
        defaultsForNewRule={{ TargetPorts: "" }}
        emptyHint="هنوز قانونی بر اساس پورت مشخص تعریف نشده."
      />
    </div>
  );
}
