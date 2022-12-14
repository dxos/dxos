import React from "react";
import { ClientProvider } from "@dxos/react-client";
import { GenericFallback } from "@dxos/react-appkit";
import { ServiceWorkerToast } from "@dxos/react-appkit";
import { Config } from "@dxos/config";
import { Dynamics } from "@dxos/config";
import { Defaults } from "@dxos/config";
import { useRegisterSW } from "virtual:pwa-register/react";
import { UiKitProvider } from "@dxos/react-uikit";
import { Fallback } from "@dxos/react-appkit";

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (err) => {
      console.error(err);
    },
  });
  return (
    <UiKitProvider
      appNs="@dxos/bare"
      fallback={<Fallback message="Loading..." />}
    >
      <ClientProvider config={config} fallback={<GenericFallback />}>
        {/* your components here */}
        {needRefresh ? (
          <ServiceWorkerToast
            {...{ variant: "needRefresh", updateServiceWorker }}
          />
        ) : offlineReady ? (
          <ServiceWorkerToast variant="offlineReady" />
        ) : null}
      </ClientProvider>
    </UiKitProvider>
  );
};
