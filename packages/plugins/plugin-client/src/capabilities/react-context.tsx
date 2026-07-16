//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { ReactNode } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/ui';
import { ClientProvider } from '@dxos/react-client';

import { meta } from '#meta';
import { ClientCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(Capabilities.ReactContext, {
      id: meta.profile.key,
      context: ({ children }: { children?: ReactNode }) => {
        const client = useCapability(ClientCapabilities.Client);
        return <ClientProvider client={client}>{children}</ClientProvider>;
      },
    }),
  ]),
);
