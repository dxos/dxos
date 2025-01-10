//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework/next';
import { ClientProvider } from '@dxos/react-client';

import { ClientCapabilities } from './capabilities';
import { CLIENT_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: CLIENT_PLUGIN,
    context: ({ children }) => {
      const client = useCapability(ClientCapabilities.Client);
      return <ClientProvider client={client}>{children}</ClientProvider>;
    },
  });
