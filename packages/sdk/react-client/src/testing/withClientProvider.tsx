//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { createContext, type PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { type FallbackProps, ErrorBoundary as NativeErrorBoundary } from 'react-error-boundary';

import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { performInvitation, TestBuilder } from '@dxos/client/testing';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { ClientProvider, type ClientProviderProps } from '../client';

type InitializeProps = {
  createIdentity?: boolean;
  createSpace?: boolean;
  onInitialized?: (client: Client) => MaybePromise<Record<string, any> | void>;
  onSpaceCreated?: (props: { client: Client; space: Space }) => MaybePromise<Record<string, any> | void>;
};

/**
 * Initialize client, identity and first space.
 */
const initializeClient = async (
  client: Client,
  { createIdentity, createSpace, onSpaceCreated, onInitialized }: InitializeProps,
): Promise<StoryClientProps> => {
  const clientData = await onInitialized?.(client);

  if (createIdentity || createSpace) {
    if (!client.halo.identity.get()) {
      await client.halo.createIdentity();
    }
  }

  let space: Space | undefined;
  let spaceData: Record<string, any> | void = {};
  if (createSpace) {
    space = await client.spaces.create({ name: 'Test Space' });
    spaceData = await onSpaceCreated?.({ client, space });
  }

  return { space, ...clientData, ...spaceData };
};

type StoryClientProps<T extends Record<string, any> = Record<string, unknown>> = T & { space?: Space };

// TODO(wittjosiah): Add to multi-client as well.
const StoryClientContext = createContext<StoryClientProps | undefined>(undefined);

export const useStoryClientData = <T extends Record<string, any> = Record<string, unknown>>() => {
  const data = useContext(StoryClientContext) ?? raise(new Error('Missing withClientProvider decorator.'));
  return data as StoryClientProps<T>;
};

export type WithClientProviderProps = InitializeProps & Omit<ClientProviderProps, 'onInitialized'>;

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
    const [data, setData] = useState<StoryClientProps>({});

    const handleInitialized = async (client: Client) => {
      setData(await initializeClient(client, { createIdentity, createSpace, onSpaceCreated, onInitialized }));
    };

    return (
      <ErrorBoundary>
        <ClientProvider onInitialized={handleInitialized} {...props}>
          <StoryClientContext.Provider value={data}>
            <Story />
          </StoryClientContext.Provider>
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
          const { space } = await initializeClient(client, {
            createIdentity,
            createSpace,
            onSpaceCreated,
            onInitialized,
          });
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
