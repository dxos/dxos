import template from '../template.t';
import { plate } from '@dxos/plate';

export default template.define.script({
  content: ({ input: { defaultPlugins } }) => plate/* javascript */`
    import "@dxosTheme";

    import React from "react";
    import { Status, ThemeProvider, Tooltip } from "@dxos/react-ui";
    import { defaultTx } from "@dxos/react-ui-theme";
    import { createApp, Plugin } from "@dxos/app-framework";
    import { createRoot } from "react-dom/client";
    import translations from "./translations";
    
    ${defaultPlugins && plate/* javascript */`
    import ClientMeta from "@braneframe/plugin-client/meta";
    import GraphMeta from "@braneframe/plugin-graph/meta";
    import LayoutMeta from "@braneframe/plugin-layout/meta";
    import NavTreeMeta from "@braneframe/plugin-navtree/meta";
    import SpaceMeta from "@braneframe/plugin-space/meta";
    import StackMeta from "@braneframe/plugin-stack/meta";
    import ThemeMeta from "@braneframe/plugin-theme/meta";
    `}
    
    import { meta } from "../src/plugin";
    
    const App = createApp({
      fallback: ({ error }) => (
        <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
          <Tooltip.Provider>
            <div className="flex bs-[100dvh] justify-center items-center p-6 text-red-500">
              {error.message}
            </div>
          </Tooltip.Provider>
        </ThemeProvider>
      ),
      placeholder: (
        <ThemeProvider tx={defaultTx}>
          <div className="flex bs-[100dvh] justify-center items-center">
            <Status indeterminate aria-label="Initializing" placeholder="" />
          </div>
        </ThemeProvider>
      ),
      plugins: {
        [ThemeMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-theme"), {
          appName: "Composer",
        }),
        ${defaultPlugins && plate/* javascript */`
        [GraphMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-graph")),
        [LayoutMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-layout")),
        [NavTreeMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-navTree")),
        [ClientMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-client"), {
          appKey: "composer.local",
        }),
        [SpaceMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-space")),
        [StackMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-stack")),
        `}
        [meta.id]: Plugin.lazy(() => import("../src/plugin")),
      },
      order: [
        // Outside of error boundary so error dialog is styled.
        ThemeMeta,
        ${defaultPlugins && plate/* javascript */`
        LayoutMeta,
        NavTreeMeta,
        ClientMeta,
        SpaceMeta,
        GraphMeta,
        StackMeta,
        `}
        meta,
      ],
    });
    
    createRoot(document.getElementById("root")!).render(<App />);
  `
});