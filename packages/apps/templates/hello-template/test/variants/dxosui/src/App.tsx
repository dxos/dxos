import React from "react";
import { ClientProvider } from "@dxos/react-client";
import { GenericFallback, appkitTranslations } from "@dxos/react-appkit";
import { Welcome } from "./Welcome";
import { Config, Dynamics, Defaults } from "@dxos/config";
import { ThemeProvider } from "@dxos/react-components";

import "./index.css";

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  return (
    <ThemeProvider
      appNs="@dxos/hello-template-dxosui"
      resourceExtensions={[appkitTranslations]}
      fallback={<GenericFallback />}
    >
      <ClientProvider config={config} fallback={<GenericFallback />}>
        <Welcome name="@dxos/hello-template-dxosui" />
      </ClientProvider>
    </ThemeProvider>
  );
};
