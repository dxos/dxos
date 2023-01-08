import React from "react";
import { Config, Dynamics, Defaults } from "@dxos/config";
import { ClientProvider } from "@dxos/react-client";

const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  return (
    <ClientProvider config={config}>
      {/* your components here */}
    </ClientProvider>
  );
};
