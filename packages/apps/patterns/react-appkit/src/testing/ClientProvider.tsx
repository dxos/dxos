//
// Copyright 2022 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider as NaturalClientProvider } from '@dxos/react-client';

const configProvider = async () => new Config(await Dynamics(), Defaults());

export const ClientProvider = ({ children }: PropsWithChildren<{}>) => {
  return (
    <NaturalClientProvider config={configProvider} fallback={<span>Starting client…</span>}>
      {children}
    </NaturalClientProvider>
  );
};
