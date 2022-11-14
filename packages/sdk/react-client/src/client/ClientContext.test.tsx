//
// Copyright 2020 DXOS.org
//

import { renderHook, screen, render } from '@testing-library/react';
import expect from 'expect';
import React, { Component, PropsWithChildren } from 'react';

import { Client } from '@dxos/client';
import { ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';

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

  it.skip('should throw when used outside a context', function () {
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

  it('should return client when used properly in a context', function () {
    const config: ConfigProto = {
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: false
          }
        }
      }
    };

    const client = new Client({ config });
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    expect(result.current).toEqual(client);
  });
});

describe('ClientProvider', function () {
  let client: Client;

  before(async function () {
    client = new Client();
    await client.initialize();
    await client.halo.createProfile({ displayName: 'test-user' });
  });

  after(async function () {
    await client.destroy();
  });

  it('Renders with children', async function () {
    render(
      <ClientProvider client={client}>
        <TestComponent />
      </ClientProvider>
    );

    expect(() => screen.getByText('Hello World')).not.toThrow();
  });

  it('Provides the client', async function () {
    render(
      <ClientProvider client={client}>
        <TestComponent />
      </ClientProvider>
    );

    expect(() => screen.getByText('Client is defined')).not.toThrow();
    expect(() => screen.getByText('Client is NOT there')).toThrow();
  });
});
