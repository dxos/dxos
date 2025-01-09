//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapabilities } from '@dxos/app-framework/next';
import { invariant } from '@dxos/invariant';
import { ClientProvider } from '@dxos/react-client';

import { ClientCapabilities } from './capabilities';
import { CLIENT_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: CLIENT_PLUGIN,
    context: ({ children }) => {
      const [client] = useCapabilities(ClientCapabilities.Client);
      invariant(client, 'Client not found');
      return <ClientProvider client={client}>{children}</ClientProvider>;
    },
  });
