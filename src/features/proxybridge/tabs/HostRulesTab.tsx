import { RuleTable } from "../components/RuleTable";
import type { ProxyRule } from "@/types/proxybridge";

export function HostRulesTab() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">🌐 Host Rules</h2>
        <p className="text-sm text-muted-foreground">
          قوانینی که تمرکزشون روی هاست/IP مقصده (IPv4، IPv6، CIDR، Range). این‌ها همون
          Ruleهای اصلی هستن؛ این نما فقط اونایی که TargetHosts مشخص (نه *) دارن رو
          برجسته و اول نشون می‌ده.
        </p>
      </div>
      <RuleTable
        title=""
        emphasize="host"
        filter={(r: ProxyRule) => r.TargetHosts !== "*" && r.TargetHosts.trim() !== ""}
        defaultsForNewRule={{ TargetHosts: "" }}
        emptyHint="هنوز قانونی بر اساس هاست مشخص تعریف نشده."
      />
    </div>
  );
}
