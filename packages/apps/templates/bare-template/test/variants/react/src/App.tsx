import React from "react";
import { ClientProvider } from "@dxos/react-client";
import { Config, Dynamics, Defaults } from "@dxos/config";

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  return (
    <ClientProvider config={config}>
      <div>Your code goes here</div>
    </ClientProvider>
  );
};
