//
// Copyright 2022 DXOS.org
//

import React from "react";
import { Client } from "@dxos/client";
import { ClientProvider } from "@dxos/react-client";

const client = new Client();

const App = () => {
  return (
    <ClientProvider client={client}>
      {/* Your components here  */}
    </ClientProvider>
  );
};
