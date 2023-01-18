//
// Copyright 2020 DXOS.org
//

import { renderHook, screen, render, act } from '@testing-library/react';
import expect from 'expect';
import React, { Component, PropsWithChildren } from 'react';

import { waitForCondition } from '@dxos/async';
import { Client, Config, fromHost, Status } from '@dxos/client';
import { log } from '@dxos/log';
import { afterAll, beforeAll, describe, test } from '@dxos/test';

import { ClientProvider, useClient } from './ClientContext';

const TestComponent = () => {
  const client = useClient();
  return (
    <>
      <div>Hello World</div>
      <div>{`Client is ${client ? 'defined' : 'NOT there'}`}</div>
    </>
  );
};

describe('Client hook', function () {
  const render = () => useClient();

  test.skip('should throw when used outside a context', function () {
    // TODO(wittjosiah): Fix and factor out.
    // Based on https://github.com/testing-library/react-testing-library/pull/991#issuecomment-1207138334
    let error;
    const { result } = renderHook(render, {
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
      }
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
            persistent: false
          }
        }
      }
    });

    const client = new Client({ config, services: fromHost(config) });
    await client.initialize();
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    await act(async () => {
      await waitForCondition(async () => (await client.getStatus()).status === Status.OK);
    });
    expect(result.current).toEqual(client);
  });
});

describe('ClientProvider', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createProfile({ displayName: 'test-user' });
  });

  afterAll(async () => {
    await client.destroy();
  });

  test('Renders with children', async () => {
    render(
      <ClientProvider client={client}>
        <TestComponent />
      </ClientProvider>
    );

    await act(async () => {
      await waitForCondition(async () => (await client.getStatus()).status === Status.OK);
    });

    expect(() => screen.getByText('Hello World')).not.toThrow();
  });

  test('Provides the client', async () => {
    render(
      <ClientProvider client={client}>
        <TestComponent />
      </ClientProvider>
    );

    await act(async () => {
      await waitForCondition(async () => (await client.getStatus()).status === Status.OK);
    });

    expect(() => screen.getByText('Client is defined')).not.toThrow();
    expect(() => screen.getByText('Client is NOT there')).toThrow();
  });
});
