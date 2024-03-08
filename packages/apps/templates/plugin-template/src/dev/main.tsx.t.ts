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
    
    import ThemeMeta from "@braneframe/plugin-theme/meta";
    ${defaultPlugins && plate/* javascript */`
    import ClientMeta from "@braneframe/plugin-client/meta";
    import GraphMeta from "@braneframe/plugin-graph/meta";
    import LayoutMeta from "@braneframe/plugin-layout/meta";
    import NavTreeMeta from "@braneframe/plugin-navtree/meta";
    import SpaceMeta from "@braneframe/plugin-space/meta";
    import StackMeta from "@braneframe/plugin-stack/meta";
    import SettingsMeta from "@braneframe/plugin-settings/meta";
    import MetadataMeta from "@braneframe/plugin-metadata/meta";
    
    import { createClientServices } from "@dxos/react-client";
    import { createConfig } from "./config";
    `}
    
    import { meta } from "../src/plugin";
    
    (async function () {
      ${
        defaultPlugins && plate/* javascript */`
        const config = await createConfig();
        const services = await createClientServices(
          config,
          // () =>
          //   new SharedWorker(new URL("@dxos/client/shared-worker", import.meta.url), {
          //     type: "module",
          //     name: "dxos-client-worker",
          //   })
        );`
      }
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
          [LayoutMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-layout")),
          [NavTreeMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-navTree")),
          [SettingsMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-settings")),
          [ClientMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-client"), {
            appKey: "composer.local",
            config,
            services,
            shell: "./shell.html",
          }),
          [SpaceMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-space")),
          [GraphMeta.id]: Plugin.lazy(() => import("@braneframe/plugin-graph")),
          [MetadataMeta.id]: Plugin.lazy(
            () => import("@braneframe/plugin-metadata")
          ),
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
          SettingsMeta,
          ClientMeta,
          SpaceMeta,
          GraphMeta,
          MetadataMeta,
          StackMeta,
          `}
          meta,
        ],
      });
      
      createRoot(document.getElementById("root")!).render(<App />);
    })();
  `
});