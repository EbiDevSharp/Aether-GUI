import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { invoke } from "@tauri-apps/api/core";
import { Zap, Settings2, FlaskConical, Route, ScrollText } from "lucide-react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { SidecarErrorScreen } from "@/components/SidecarErrorScreen";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TitleBar } from "@/components/TitleBar";
import { HomeTab } from "@/components/tabs/HomeTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { ExpertTab } from "@/components/tabs/ExpertTab";
import { RulesTab } from "@/components/tabs/RulesTab";
import { LogsTab } from "@/components/tabs/LogsTab";
import { initConnectionListeners, useConnectionStore } from "@/state/connectionStore";
import { initUpdateListeners } from "@/state/updateStore";
import { useLanguage } from "@/i18n/LanguageContext";

const SCREEN_TRANSITION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const },
};

export type TabId = "connect" | "settings" | "expert" | "rules" | "logs";

/**
 * Top-level tab bar for the whole app. This replaced a single scrolling
 * column (Connect button + status, then Advanced and Expert as stacked
 * collapsible accordions, then a text link that popped ProxyBridge open in
 * its own separate window). That grew cluttered as more panels were added
 * ("Advanced", "Expert", and ProxyBridge each competing for the same
 * column) — now each concern is its own tab, and ProxyBridge in particular
 * is no longer a separate app-within-the-app with its own window and
 * identity; it's just the "Rules" tab.
 *
 * `tab`/`onTabChange` are lifted to <App> (see below) rather than kept as
 * local state here, because TitleBar also needs to know the active tab —
 * it hides the Compact/Normal window-size toggle while Rules is active,
 * since that tab drives the window size itself (see the effect below and
 * commands.rs::set_rules_view).
 */
function MainTabs({ tab, onTabChange }: { tab: TabId; onTabChange: (tab: TabId) => void }) {
  const { t } = useLanguage();

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => onTabChange(v as TabId)}
      className="relative z-10 h-full min-h-0"
    >
      <TabsList>
        <TabsTrigger value="connect">
          <Zap size={15} />
          <span className="hidden min-[380px]:inline">{t.tabs.connect}</span>
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings2 size={15} />
          <span className="hidden min-[380px]:inline">{t.tabs.settings}</span>
        </TabsTrigger>
        <TabsTrigger value="expert">
          <FlaskConical size={15} />
          <span className="hidden min-[380px]:inline">{t.tabs.expert}</span>
        </TabsTrigger>
        <TabsTrigger value="rules">
          <Route size={15} />
          <span className="hidden min-[380px]:inline">{t.tabs.rules}</span>
        </TabsTrigger>
        <TabsTrigger value="logs">
          <ScrollText size={15} />
          <span className="hidden min-[380px]:inline">{t.tabs.logs}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="connect" className="flex flex-col">
        <HomeTab />
      </TabsContent>
      <TabsContent value="settings" className="flex flex-col overflow-y-auto">
        <div className="flex justify-center px-6">
          <SettingsTab />
        </div>
      </TabsContent>
      <TabsContent value="expert" className="flex flex-col overflow-y-auto">
        <div className="flex justify-center px-6">
          <ExpertTab />
        </div>
      </TabsContent>
      <TabsContent value="rules" className="flex flex-col">
        <RulesTab />
      </TabsContent>
      <TabsContent value="logs" className="flex flex-col">
        <LogsTab />
      </TabsContent>
    </Tabs>
  );
}

export function App() {
  const [tab, setTab] = useState<TabId>("connect");
  const sidecarError = useConnectionStore((s) => s.sidecarError);
  const retryAfterSidecarError = useConnectionStore((s) => s.retryAfterSidecarError);
  const connect = useConnectionStore((s) => s.connect);

  useEffect(() => {
    const cleanup = initConnectionListeners();
    const updateCleanup = initUpdateListeners();
    return () => {
      void cleanup.then((unlisten) => unlisten());
      void updateCleanup.then((unlisten) => unlisten());
    };
  }, []);

  // Rules is the one tab that needs real width for its rule tables (it used
  // to get that from its own 960×640 popup window — see RulesTab.tsx). The
  // window itself grows/shrinks on every tab switch instead; leaving Rules
  // restores whatever size (Normal/Compact) the user had chosen before.
  useEffect(() => {
    invoke("set_rules_view", { active: tab === "rules" }).catch((e) =>
      console.error("Failed to resize window for tab:", e),
    );
  }, [tab]);

  return (
    <TooltipProvider>
      <MotionConfig reducedMotion="user">
        <div className="relative flex h-svh w-full flex-col overflow-hidden bg-background">
          <AmbientBackground />
          <TitleBar hideWindowSizeToggle={tab === "rules"} />
          <div className="relative min-h-0 flex-1">
            <AnimatePresence mode="sync">
              {sidecarError ? (
                <motion.div key="error" className="absolute inset-0 z-10" {...SCREEN_TRANSITION}>
                  <SidecarErrorScreen
                    message={sidecarError}
                    onRetry={() => {
                      retryAfterSidecarError();
                      void connect();
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="main"
                  className="absolute inset-0 flex flex-col"
                  {...SCREEN_TRANSITION}
                >
                  <MainTabs tab={tab} onTabChange={setTab} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </MotionConfig>
    </TooltipProvider>
  );
}

export default App;
