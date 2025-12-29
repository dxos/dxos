//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { ClientProvider } from '@dxos/react-client';

import { meta } from '../meta';
import { ClientCapabilities } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactContext, {
    id: meta.id,
    context: (({ children }: { children?: React.ReactNode }) => {
      const client = useCapability(ClientCapabilities.Client);
      return <ClientProvider client={client}>{children}</ClientProvider>;
    }) as React.FC<{ children?: React.ReactNode }>,
  }),
);
