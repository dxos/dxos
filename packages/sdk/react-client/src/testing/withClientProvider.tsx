//
// Copyright 2024 DXOS.org
//

import { type Decorator, type StoryContext } from '@storybook/react';
import React, { type PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from 'react';
import { type FallbackProps, ErrorBoundary as NaturalErrorBoundary } from 'react-error-boundary';

import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { ClientProvider, type ClientProviderProps } from '../client';

import { ClientStory } from './context';

type InitializeProps = {
  createIdentity?: boolean;
  createSpace?: boolean;
  onInitialized?: (client: Client) => MaybePromise<void>;
  onCreateIdentity?: (props: { client: Client }, context: StoryContext | any) => MaybePromise<void>;
  // NOTE: context must be untyped until ClientRepeater is removed.
  onCreateSpace?: (props: { client: Client; space: Space }, context: StoryContext | any) => MaybePromise<void>;
};

/**
 * Initialize client, identity and first space.
 */
const initializeClient = async (
  client: Client,
  { createIdentity, createSpace, onCreateIdentity, onCreateSpace, onInitialized }: InitializeProps,
  context: StoryContext,
): Promise<ClientStory> => {
  await onInitialized?.(client);

  if (createIdentity || createSpace) {
    if (!client.halo.identity.get()) {
      await client.halo.createIdentity();
      await client.spaces.waitUntilReady();
      await client.spaces.default.waitUntilReady();
      await onCreateIdentity?.({ client }, context);
    }
  }

  let space: Space | undefined;
  if (createSpace) {
    space = await client.spaces.create({ name: 'Test Space' });
    await space.waitUntilReady(); // Is this required?
    await onCreateSpace?.({ client, space }, context);
  }

  return { space };
};

export type WithClientProviderProps = InitializeProps & Omit<ClientProviderProps, 'onInitialized'>;

/**
 * Decorator that provides the client context.
 */
export const withClientProvider = ({
  createIdentity,
  createSpace,
  onCreateSpace,
  onCreateIdentity,
  onInitialized,
  ...props
}: WithClientProviderProps = {}): Decorator => {
  return (Story, context) => {
    const [data, setData] = useState<ClientStory>({});
    const handleInitialized = async (client: Client) => {
      const data = await initializeClient(
        client,
        {
          createIdentity,
          createSpace,
          onCreateSpace,
          onCreateIdentity,
          onInitialized,
        },
        context,
      );

      setData(data);
    };

    return (
      <ErrorBoundary>
        <ClientProvider onInitialized={handleInitialized} {...props}>
          <ClientStory.Provider value={data}>
            <Story />
          </ClientStory.Provider>
        </ClientProvider>
      </ErrorBoundary>
    );
  };
};

// TODO(burdon): Implement context per client for context.
// TODO(burdon): Callback once all invitations have completed.
// TODO(burdon): Delay/jitter for creation of other clients.
export type WithMultiClientProviderProps = InitializeProps &
  Omit<ClientProviderProps, 'onInitialized'> & { numClients?: number };

const MultiClientContext = createContext<{ id: number }>({ id: 0 });

export const useMultiClient = () => useContext(MultiClientContext);

/**
 * Decorator that creates a scaffold for multiple clients.
 * Orchestrates invitations between a randomly selected host and the remaining clients.
 * NOTE: Should come before withLayout.
 */
export const withMultiClientProvider = ({
  numClients = 2,
  createIdentity,
  createSpace,
  onCreateSpace,
  onCreateIdentity,
  onInitialized,
  ...props
}: WithMultiClientProviderProps): Decorator => {
  return (Story, context) => {
    const builder = useRef(new TestBuilder());
    const hostRef = useRef<Client>(null);
    const spaceReady = useRef(new Trigger<Space | undefined>());

    // Handle invitations.
    // NOTE: The zeroth client isn't necessarily the first to be initialized.
    const handleInitialized = async (client: Client, index: number) => {
      log.info('initialized', { index });
      if (createSpace) {
        if (!hostRef.current) {
          hostRef.current = client;
          const { space } = await initializeClient(
            client,
            {
              createIdentity,
              createSpace,
              onCreateSpace,
              onCreateIdentity,
              onInitialized,
            },
            context,
          );

          spaceReady.current.wake(space);
          log.info('inviting', { index });
        } else {
          await initializeClient(client, { createIdentity, onInitialized }, context);
          const space = await spaceReady.current.wait();
          if (space) {
            log.info('joining', { index });
            await Promise.all(performInvitation({ host: space, guest: client.spaces }));
          }
        }
      }
    };

    return (
      <ErrorBoundary>
        {Array.from({ length: numClients }).map((_, index) => (
          <MultiClientContext.Provider key={index} value={{ id: index }}>
            <ClientProvider
              services={builder.current.createLocalClientServices()}
              onInitialized={(client) => handleInitialized(client, index)}
              {...props}
            >
              <Story />
            </ClientProvider>
          </MultiClientContext.Provider>
        ))}
      </ErrorBoundary>
    );
  };
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

  return <NaturalErrorBoundary FallbackComponent={ErrorFallback}>{children}</NaturalErrorBoundary>;
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
