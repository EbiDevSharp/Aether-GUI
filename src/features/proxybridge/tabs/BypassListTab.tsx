import { RuleTable } from "../components/RuleTable";
import type { ProxyRule } from "@/types/proxybridge";

export function BypassListTab() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">🔴 Bypass List</h2>
        <p className="text-sm text-muted-foreground">
          برنامه‌ها/آدرس‌هایی که همیشه باید مستقیم (بدون پراکسی) برن — برای جلوگیری از
          proxy loop یا سرویس‌هایی که نباید پراکسی بشن (مثل خودِ برنامه‌ی پراکسی، آپدیت
          ویندوز، DNS محلی). این Rule ها با اولویت بالا (بالای بقیه) اجرا می‌شن.
        </p>
      </div>
      <RuleTable
        title=""
        emphasize="process"
        filter={(r: ProxyRule) => r.Action === "DIRECT"}
        defaultsForNewRule={{ Action: "DIRECT" }}
        emptyHint='هنوز چیزی به Bypass اضافه نشده. مثال: ProxyBridge_CLI.exe یا 127.0.0.1 رو Bypass کن تا لوپ نشه.'
      />
    </div>
  );
}
