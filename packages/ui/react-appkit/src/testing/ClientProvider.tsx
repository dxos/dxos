//
// Copyright 2022 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Config, Defaults, Dynamics, Local, ClientProvider as NaturalClientProvider } from '@dxos/react-client';

const configProvider = async () => new Config(await Dynamics(), Local(), Defaults());

export const ClientProvider = ({ children }: PropsWithChildren<{}>) => {
  return (
    <NaturalClientProvider config={configProvider} fallback={() => <span>Starting client…</span>}>
      {children}
    </NaturalClientProvider>
  );
};
