import React from "react";
import { Config } from "@dxos/config";
import { Dynamics } from "@dxos/config";
import { Defaults } from "@dxos/config";
import { ClientProvider } from "@dxos/react-client";

const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  return (
    <ClientProvider config={config}>
      {/* your components here */}
    </ClientProvider>
  );
};
