import { RuleTable } from "../components/RuleTable";
import type { ProxyRule } from "@/types/proxybridge";

export function ApplicationRulesTab() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">📦 Application Rules</h2>
        <p className="text-sm text-muted-foreground">
          قوانینی که تمرکزشون روی یک برنامه‌ی مشخصه (به‌جای *). با دکمه‌ی «انتخاب...»
          توی دیالوگ می‌تونی مستقیم exe رو از دیسک انتخاب کنی.
        </p>
      </div>
      <RuleTable
        title=""
        emphasize="process"
        filter={(r: ProxyRule) => r.ProcessName !== "*" && r.ProcessName.trim() !== ""}
        defaultsForNewRule={{ ProcessName: "" }}
        emptyHint="هنوز قانونی برای یک برنامه‌ی مشخص تعریف نشده."
      />
    </div>
  );
}
