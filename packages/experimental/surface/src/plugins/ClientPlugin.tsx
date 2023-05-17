//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ClientProvider } from '@dxos/react-client';

import { definePlugin } from '../framework';

export const ClientPlugin = definePlugin({
  meta: {
    id: 'ClientPlugin'
  },
  provides: {
    context: ({ children }) => <ClientProvider>{children}</ClientProvider>
  }
});
