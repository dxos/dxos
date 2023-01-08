import React from "react";
import { ClientProvider } from "@dxos/react-client";
import {
  GenericFallback,
  ServiceWorkerToastContainer,
  appkitTranslations,
} from "@dxos/react-appkit";
import { Welcome } from "./Welcome";
import { Config, Dynamics, Defaults } from "@dxos/config";
import { useRegisterSW } from "virtual:pwa-register/react";
import { ThemeProvider } from "@dxos/react-components";

import "./index.css";

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  const serviceWorker = useRegisterSW();
  return (
    <ThemeProvider
      appNs="@dxos/hello-template-max"
      resourceExtensions={[appkitTranslations]}
      fallback={<GenericFallback />}
    >
      <ClientProvider config={config} fallback={<GenericFallback />}>
        <Welcome name="@dxos/hello-template-max" />
        <ServiceWorkerToastContainer {...serviceWorker} />
      </ClientProvider>
    </ThemeProvider>
  );
};
