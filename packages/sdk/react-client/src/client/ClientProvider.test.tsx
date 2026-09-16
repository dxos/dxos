//
// Copyright 2020 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import React, { Component, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest';

import { Event, MulticastObservable, Trigger, waitForCondition } from '@dxos/async';
import { Client, Config, SystemStatus } from '@dxos/client';
import { fromHost } from '@dxos/client/local';
import { log } from '@dxos/log';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { useIdentity } from '../halo/index.ts';
import { ClientProvider } from './ClientProvider.tsx';
import { useClient } from './useClient.ts';

log.config({ filter: 'ClientContext:debug,warn' });

const TestComponent = () => {
  const client = useClient();
  const identity = useIdentity();

  return (
    <>
      <div>Hello World</div>
      <div>{`Client is ${client ? 'defined' : 'NOT there'}`}</div>
      <div>{`Identity is ${identity ? 'defined' : 'NOT there'}`}</div>
    </>
  );
};

class TestErrorBoundary extends Component<
  PropsWithChildren<{ onError: (error: unknown) => void }>,
  { error?: unknown }
> {
  override state: { error?: unknown } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  override render() {
    return this.state.error === undefined ? this.props.children : null;
  }
}

describe('Client hook', function () {
  test.skip('should throw when used outside a context', function () {
    // TODO(wittjosiah): Fix and factor out.
    // Based on https://github.com/testing-library/react-testing-library/pull/991#issuecomment-1207138334
    let error;
    const { result } = renderHook(() => useClient(), {
      wrapper: class Wrapper extends Component<PropsWithChildren<unknown>> {
        constructor(props: PropsWithChildren<unknown>) {
          super(props);
          this.state = { hasError: false };
        }

        static getDerivedStateFromError() {
          // Update state so the next render will show the fallback UI.
          return { hasError: true };
        }

        override componentDidCatch(err: Error) {
          log.catch(err);
          error = err;
        }

        override render() {
          return this.props.children;
        }
      },
    });

    expect(error).toBeDefined();
    expect(result).not.toBeDefined();
  });

  test('should return client when used properly in a context', async () => {
    const config = new Config({
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: false,
          },
        },
      },
    });

    const client = new Client({ config, services: fromHost(config) });
    await client.initialize();
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(() => useClient(), { wrapper });
    await act(async () => {
      await waitForCondition({ condition: () => client.status.get() === SystemStatus.ACTIVE });
    });
    expect(result.current).toEqual(client);
  });
});

describe('ClientProvider', () => {
  let client: Client;

  beforeEach(async () => {
    // TODO(wittjosiah): Use test builder to avoid warnings.
    client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: 'test-user' }));
  });

  afterEach(() => {
    cleanup();
  });

  test('Renders with children', async () => {
    render(
      <ClientProvider client={client}>
        <TestComponent />
      </ClientProvider>,
    );

    await act(async () => {
      await waitForCondition({ condition: () => client.status.get() === SystemStatus.ACTIVE });
    });

    expect(() => screen.getByText('Hello World')).not.toThrow();
  });

  test('Provides the client', async () => {
    render(
      <ClientProvider client={client}>
        <TestComponent />
      </ClientProvider>,
    );

    await act(async () => {
      await waitForCondition({ condition: () => client.status.get() === SystemStatus.ACTIVE });
    });

    expect(() => screen.getByText('Client is defined')).not.toThrow();
    expect(() => screen.getByText('Client is NOT there')).toThrow();
  });

  test('Provides new client when value changes', async () => {
    const { rerender } = render(
      <ClientProvider client={client}>
        <TestComponent />
      </ClientProvider>,
    );

    await act(async () => {
      await waitForCondition({ condition: () => client.status.get() === SystemStatus.ACTIVE });
    });
    expect(() => screen.getByText('Identity is defined')).not.toThrow();

    const newClient = new Client({ services: fromHost() });
    await newClient.initialize();
    rerender(
      <ClientProvider client={newClient}>
        <TestComponent />
      </ClientProvider>,
    );

    await act(async () => {
      await waitForCondition({
        condition: () => newClient.status.get() === SystemStatus.ACTIVE,
      });
    });
    // If client is provided externally, the provider will not destroy it.
    expect(client.initialized).toBe(true);
    expect(() => screen.getByText('Identity is NOT there')).not.toThrow();
  });

  test('onInitialized rejection reaches the error boundary', async () => {
    const failure = new Error('onInitialized failed');
    const initialized = new Trigger();
    let caught: unknown;
    const uninitialized = new Client({ services: fromHost() });
    render(
      <TestErrorBoundary onError={(error) => (caught = error)}>
        <ClientProvider
          client={uninitialized}
          onInitialized={async () => {
            initialized.wake();
            throw failure;
          }}
        >
          <TestComponent />
        </ClientProvider>
      </TestErrorBoundary>,
    );

    await act(async () => {
      await initialized.wait();
    });
    await waitFor(() => expect(caught).toBe(failure));
    expect(screen.queryByText('Hello World')).toBeNull();
    await uninitialized.destroy();
  });

  test('initialize rejection reaches the error boundary without running onInitialized', async () => {
    const failure = new Error('initialize failed');
    class FailingClient extends Client {
      override async initialize(): Promise<Client> {
        throw failure;
      }
    }

    let caught: unknown;
    const onInitialized = vi.fn();
    render(
      <TestErrorBoundary onError={(error) => (caught = error)}>
        <ClientProvider client={new FailingClient()} onInitialized={onInitialized}>
          <TestComponent />
        </ClientProvider>
      </TestErrorBoundary>,
    );

    await waitFor(() => expect(caught).toBe(failure));
    expect(onInitialized).not.toHaveBeenCalled();
  });

  test('fatal client error after initialization reaches the error boundary', async () => {
    const failure = new Error('services lost');
    const fatalErrorUpdate = new Event<Error | null>();
    const fatalError = MulticastObservable.from(fatalErrorUpdate, null);
    class LostClient extends Client {
      override get fatalError(): MulticastObservable<Error | null> {
        return fatalError;
      }
    }

    const lost = new LostClient({ services: fromHost() });
    await lost.initialize();
    onTestFinished(() => lost.destroy());

    let caught: unknown;
    render(
      <TestErrorBoundary onError={(error) => (caught = error)}>
        <ClientProvider client={lost}>
          <TestComponent />
        </ClientProvider>
      </TestErrorBoundary>,
    );
    await waitFor(() => expect(screen.queryByText('Hello World')).not.toBeNull());

    act(() => fatalErrorUpdate.emit(failure));
    await waitFor(() => expect(caught).toBe(failure));
    expect(screen.queryByText('Hello World')).toBeNull();
  });
});
