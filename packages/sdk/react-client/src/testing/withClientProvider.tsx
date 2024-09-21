//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { type PropsWithChildren, useEffect } from 'react';

import { type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { doAsync, getProviderValue, type Provider } from '@dxos/util';

import { ClientProvider, type ClientProviderProps, useClient } from '../client';
import { useIdentity } from '../halo';

type InitializerProps = {
  createIdentity?: boolean | ProfileDocument | Provider<ProfileDocument>;
};

export type WithClientProviderProps = InitializerProps & ClientProviderProps;

/**
 * Decorator that provides the client context.
 */
export const withClientProvider = ({ createIdentity, ...props }: WithClientProviderProps = {}): Decorator => {
  return (Story) => (
    <ClientProvider {...props}>
      <Initializer createIdentity={createIdentity}>
        <Story />
      </Initializer>
    </ClientProvider>
  );
};

const Initializer = ({ children, createIdentity }: PropsWithChildren<InitializerProps>) => {
  const client = useClient();
  const identity = useIdentity();
  useEffect(() => {
    if (createIdentity && client) {
      void doAsync(async () => {
        await client.initialize();
        // TODO(burdon): [SDK]: If no props provided then profile is null (should be {}).
        const profile = createIdentity === true ? {} : getProviderValue(createIdentity);
        await client.halo.createIdentity(profile);
      });
    }
  }, [client]);

  if (createIdentity && !identity) {
    return null;
  }

  return children;
};

// TODO(burdon): ErrorBoundary.
