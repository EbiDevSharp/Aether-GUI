import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Shared label+input row used across the Settings and Expert tabs (used to
 * live inside AdvancedPanel.tsx when both were accordions in one column;
 * pulled out to its own file once they became separate tab contents so
 * neither has to import from the other).
 */
export function FieldRow({
  label,
  tooltip,
  aboutLabel,
  children,
}: {
  label: string;
  tooltip?: string;
  aboutLabel: (label: string) => string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger aria-label={aboutLabel(label)}>
              <Info size={12} />
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
    </div>
  );
}
