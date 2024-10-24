//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { type FallbackProps, ErrorBoundary as NativeErrorBoundary } from 'react-error-boundary';

import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { performInvitation, TestBuilder } from '@dxos/client/testing';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { ClientProvider, type ClientProviderProps, useClient } from '../client';

type InitializeProps = {
  createIdentity?: boolean;
  createSpace?: boolean;
  onSpaceCreated?: (props: { client: Client; space: Space }) => MaybePromise<void>;
};

/**
 * Initialize client, identity and first space.
 */
const initializeClient = async (
  client: Client,
  {
    createIdentity,
    createSpace,
    onSpaceCreated,
    onInitialized,
  }: InitializeProps & Pick<WithClientProviderProps, 'onInitialized'>,
): Promise<Space | undefined> => {
  if (createIdentity || createSpace) {
    if (!client.halo.identity.get()) {
      await client.halo.createIdentity();
    }
  }

  let space: Space | undefined;
  if (createSpace) {
    space = await client.spaces.create({ name: 'Test Space' });
    await onSpaceCreated?.({ client, space });
  }

  await onInitialized?.(client);
  return space;
};

export type WithClientProviderProps = InitializeProps & ClientProviderProps;

/**
 * Decorator that provides the client context.
 */
export const withClientProvider = ({
  createIdentity,
  createSpace,
  onSpaceCreated,
  onInitialized,
  ...props
}: WithClientProviderProps = {}): Decorator => {
  return (Story) => {
    const handleInitialized = async (client: Client) => {
      await initializeClient(client, { createIdentity, createSpace, onSpaceCreated, onInitialized });
    };

    return (
      <ErrorBoundary>
        <ClientProvider onInitialized={handleInitialized} {...props}>
          <Story />
        </ClientProvider>
      </ErrorBoundary>
    );
  };
};

// TODO(burdon): Implement context per client for context.
// TODO(burdon): Callback once all invitations have completed.
// TODO(burdon): Delay/jitter for creation of other clients.
export type WithMultiClientProviderProps = InitializeProps & ClientProviderProps & { numClients?: number };

/**
 * Decorator that creates a scaffold for multiple clients.
 * Orchestrates invitations between a randomly selected host and the remaining clients.
 * NOTE: Should come before withLayout.
 */
export const withMultiClientProvider = ({
  numClients = 2,
  createIdentity,
  createSpace,
  onSpaceCreated,
  onInitialized,
  ...props
}: WithMultiClientProviderProps): Decorator => {
  return (Story) => {
    const builder = useRef(new TestBuilder());
    const hostRef = useRef<Client>();
    const spaceReady = useRef(new Trigger<Space | undefined>());

    // Handle invitations.
    // NOTE: The zeroth client isn't necessarily the first to be initialized.
    const handleInitialized = async (client: Client, index: number) => {
      log.info('initialized', { index });
      if (createSpace) {
        if (!hostRef.current) {
          hostRef.current = client;
          const space = await initializeClient(client, { createIdentity, createSpace, onSpaceCreated, onInitialized });
          spaceReady.current.wake(space);
          log.info('inviting', { index });
        } else {
          await initializeClient(client, { createIdentity, onInitialized });
          const space = await spaceReady.current.wait();
          if (space) {
            log.info('joining', { index });
            await Promise.all(performInvitation({ host: space, guest: client.spaces }));
          }
        }
      }
    };

    return (
      <div>
        <ErrorBoundary>
          {Array.from({ length: numClients }).map((_, index) => (
            <div key={index} className='border border-red-500 p-2'>
              <ClientProvider
                services={builder.current.createLocalClientServices()}
                onInitialized={(client) => handleInitialized(client, index)}
                {...props}
              >
                <ClientInfo index={index} numClients={numClients} />
                <Story />
              </ClientProvider>
            </div>
          ))}
        </ErrorBoundary>
      </div>
    );
  };
};

// TODO(burdon): Optional label.
const ClientInfo = ({ index, numClients }: { index: number; numClients: number }) => {
  const client = useClient();
  useEffect(() => {
    log.info('client', { index, numClients, client });
  }, []);

  return <div>{index}</div>;
};

const ErrorBoundary = ({ children }: PropsWithChildren) => {
  const [error, setError] = useState<Error>();
  useEffect(() => {
    const handleError = (event: PromiseRejectionEvent) => {
      setError(event.reason);
    };

    window.addEventListener('unhandledrejection', handleError);
    return () => window.removeEventListener('unhandledrejection', handleError);
  }, []);

  if (error) {
    return <ErrorFallback error={error} resetErrorBoundary={() => setError(undefined)} />;
  }

  return <NativeErrorBoundary FallbackComponent={ErrorFallback}>{children}</NativeErrorBoundary>;
};

const ErrorFallback = ({ error }: FallbackProps) => {
  const { name, message, stack } =
    error instanceof Error ? error : { name: 'Error', message: String(error), stack: undefined };
  return (
    <div role='alert' className='flex flex-col p-4 gap-4 overflow-auto'>
      <h1 className='text-xl text-red-500'>{name}</h1>
      <div className='text-lg'>{message}</div>
      {stack && <pre className='whitespace-pre-wrap text-sm text-subdued'>{stack}</pre>}
    </div>
  );
};
