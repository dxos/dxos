//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';
import { ClientProvider } from '@dxos/react-client';

import { meta } from '../meta';

import { ClientCapabilities } from './capabilities';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: meta.id,
    context: ({ children }) => {
      const client = useCapability(ClientCapabilities.Client);
      return <ClientProvider client={client}>{children}</ClientProvider>;
    },
  });
