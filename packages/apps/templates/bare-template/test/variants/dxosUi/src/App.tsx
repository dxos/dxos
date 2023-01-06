import React from "react";
import { ClientProvider } from "@dxos/react-client";
import { GenericFallback, translations } from "@dxos/react-appkit";
import { Config, Dynamics, Defaults } from "@dxos/config";
import { UiKitProvider } from "@dxos/react-uikit";

// this includes css styles from @dxos/react-ui
import "@dxosTheme";

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  return (
    <UiKitProvider
      appNs="@dxos/sample-dxosUi"
      resourceExtensions={[translations]}
      fallback={<GenericFallback />}
    >
      <ClientProvider config={config} fallback={<GenericFallback />}>
        <div>Your code goes here</div>
      </ClientProvider>
    </UiKitProvider>
  );
};
