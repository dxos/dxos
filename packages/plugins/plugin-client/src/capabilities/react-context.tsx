//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import React, { type ReactNode, useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/ui';
import { Identity, Space } from '@dxos/halo';
import { makeIdentityService, makeSpaceService } from '@dxos/halo-adapter-client';
import { HaloProvider } from '@dxos/halo-react';
import { ClientProvider } from '@dxos/react-client';

import { meta } from '#meta';
import { ClientCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(Capabilities.ReactContext, {
      id: meta.profile.key,
      context: ({ children }: { children?: ReactNode }) => {
        const client = useCapability(ClientCapabilities.Client);
        // Wrap the tree with the HALO services (via the client adapter) so `@dxos/halo-react`
        // hooks resolve. Kept inside ClientProvider while consumers migrate off `@dxos/client`.
        const services = useMemo(
          () =>
            Context.empty().pipe(
              Context.add(Identity.Service, makeIdentityService(client)),
              Context.add(Space.Service, makeSpaceService(client)),
            ),
          [client],
        );
        return (
          <ClientProvider client={client}>
            <HaloProvider services={services}>{children}</HaloProvider>
          </ClientProvider>
        );
      },
    }),
  ]),
);
