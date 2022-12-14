import React from 'react';
import { Config } from "@dxos/config";
import { Dynamics } from "@dxos/config";
import { Defaults } from "@dxos/config";
import { useRegisterSW } from "virtual:pwa-register/react";
import { ClientProvider } from "@dxos/react-client";


// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  const {
  offlineReady: [offlineReady, _setOfflineReady],
  needRefresh: [needRefresh, _setNeedRefresh],
  updateServiceWorker
} = useRegisterSW({
  onRegisterError: (err) => {
    console.error(err);
  }
});
  return (
    <ClientProvider config={config}>
      {/* your components here */}
    </ClientProvider>
  )
}