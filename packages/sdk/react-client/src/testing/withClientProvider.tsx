//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { type PropsWithChildren, useEffect } from 'react';

import { type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { ClientProvider, type ClientProviderProps, useClient } from '../client';
import { useIdentity } from '../halo';

// TODO(burdon): Factor out.
type Provider<T> = () => T;
const maybeProvide = <T,>(provider: Provider<T> | T): T => {
  return typeof provider === 'function' ? (provider as Function)() : provider;
};

// TODO(burdon): Replace use of setTimeout everywhere? (removes need to cancel).
const callAsync = async (fn: () => Promise<void>) => fn();

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
      void callAsync(async () => {
        await client.initialize();
        // TODO(burdon): If no props provided then profile is null (should be {}).
        const profile = createIdentity === true ? {} : maybeProvide(createIdentity);
        await client.halo.createIdentity(profile);
      });
    }
  }, [client]);

  if (createIdentity && !identity) {
    return null;
  }

  return children;
};
