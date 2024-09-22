//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { type PropsWithChildren, useEffect, useRef } from 'react';
import { type FallbackProps, ErrorBoundary } from 'react-error-boundary';

import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { performInvitation, TestBuilder } from '@dxos/client/testing';
import { type S } from '@dxos/echo-schema';
import { type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { doAsync, getProviderValue, type MaybePromise, type Provider } from '@dxos/util';

import { ClientProvider, type ClientProviderProps, useClient } from '../client';
import { useIdentity } from '../halo';

type InitializerProps = {
  createIdentity?: boolean | ProfileDocument | Provider<ProfileDocument>;
  createSpace?: boolean;
  types?: S.Schema<any>[];
  onClientInitialized?: (client: Client) => MaybePromise<void>;
  onSpaceCreated?: (space: Space) => MaybePromise<void>;
};

export type WithClientProviderProps = InitializerProps & ClientProviderProps;

/**
 * Decorator that provides the client context.
 */
export const withClientProvider = ({
  createIdentity,
  createSpace,
  onClientInitialized,
  onSpaceCreated,
  ...props
}: WithClientProviderProps = {}): Decorator => {
  return (Story) => (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ClientProvider {...props}>
        <ClientInitializer
          createIdentity={createIdentity}
          createSpace={createSpace}
          onClientInitialized={onClientInitialized}
          onSpaceCreated={onSpaceCreated}
        >
          <Story />
        </ClientInitializer>
      </ClientProvider>
    </ErrorBoundary>
  );
};

export type WithMultiClientProviderProps = ThemedClassName<
  InitializerProps & ClientProviderProps & { numClients?: number }
>;

/**
 * Create scaffold for multiple clients.
 * Orchestrates invitations between a randomly selected host and the remaining clients.
 */
// TODO(burdon): Controls.
// TODO(burdon): Callback once all invitations have completed.
// TODO(burdon): Control delay for creation of other clients.
export const withMultiClientProvider = ({
  numClients = 2,
  classNames,
  createIdentity,
  createSpace,
  onClientInitialized,
  onSpaceCreated,
  ...props
}: WithMultiClientProviderProps): Decorator => {
  return (Story) => {
    const builder = useRef(new TestBuilder());
    const hostRef = useRef<Client>();
    const spaceReady = useRef(new Trigger<Space>());

    // Handle invitations.
    const handleClientInitialized = async (client: Client) => {
      if (createSpace) {
        if (!hostRef.current) {
          hostRef.current = client;
          const space = await client.spaces.create({ name: 'Test' });
          await onSpaceCreated?.(space);
          spaceReady.current.wake(space);
        } else {
          const space = await spaceReady.current.wait();
          await Promise.all(performInvitation({ host: space, guest: client.spaces }));
        }
      }

      await onClientInitialized?.(client);
    };

    return (
      <div role='none' className={mx(classNames)}>
        {Array.from({ length: numClients }).map((_, index) => (
          <ErrorBoundary key={index} FallbackComponent={ErrorFallback}>
            <ClientProvider services={builder.current.createLocalClientServices()} {...props}>
              <ClientInitializer createIdentity={createIdentity} onClientInitialized={handleClientInitialized}>
                <Story />
              </ClientInitializer>
            </ClientProvider>
          </ErrorBoundary>
        ))}
      </div>
    );
  };
};

const ErrorFallback = ({ error }: FallbackProps) => {
  const { name, message, stack } =
    error instanceof Error ? error : { name: 'Error', message: String(error), stack: undefined };
  return (
    <div role='alert' className='flex flex-col gap-4'>
      <h1 className='text-xl text-red-500'>{name}</h1>
      <div className='text-lg'>{message}</div>
      {stack && <pre className='text-sm text-subdued'>{stack}</pre>}
    </div>
  );
};

const ClientInitializer = ({
  children,
  createIdentity,
  createSpace,
  types,
  onClientInitialized,
  onSpaceCreated,
}: PropsWithChildren<InitializerProps>) => {
  const client = useClient();
  const identity = useIdentity();
  useEffect(() => {
    if ((createIdentity || createSpace) && client) {
      void doAsync(async () => {
        await client.initialize();
        if (types) {
          client.addTypes(types);
        }

        if (createIdentity) {
          // TODO(burdon): [SDK]: If no props provided then profile is null (should be {}).
          const profile = createIdentity === true ? {} : getProviderValue(createIdentity);
          await client.halo.createIdentity(profile);
        }
        await onClientInitialized?.(client);

        if (createSpace) {
          const space = await client.spaces.create({ name: 'Test' });
          await onSpaceCreated?.(space);
        }
      });
    }
  }, [client]);

  if (createIdentity && !identity) {
    return null;
  }

  return children;
};
