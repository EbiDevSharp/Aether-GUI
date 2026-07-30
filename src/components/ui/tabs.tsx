import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "flex shrink-0 items-stretch gap-0.5 border-b border-border bg-surface-1 px-1.5",
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Underline-style active indicator (not a filled pill) — reads as
        // top-level navigation rather than another grouped control, so it
        // doesn't visually compete with the Switch/Toggle-group controls
        // that live *inside* each tab's content.
        "group/tab relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium text-muted-foreground outline-none transition-colors select-none",
        "hover:text-foreground",
        "focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset",
        "data-[state=active]:text-foreground",
        "after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("min-h-0 flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
