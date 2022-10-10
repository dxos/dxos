//
// Copyright 2020 DXOS.org
//

import { screen, render } from '@testing-library/react';
import expect from 'expect';
import React from 'react';

import { Client } from '@dxos/client';

import { useClient } from '../hooks/index.js';
import { ClientProvider } from './ClientProvider.js';

const TestComponent = () => {
  const client = useClient();
  return (
    <>
      <div>Hello World</div>
      <div>{`Client is ${client ? 'defined' : 'NOT there'}`}</div>
    </>
  );
};

describe('ClientProvider', function () {
  let client: Client;

  before(async function () {
    client = new Client();
    await client.initialize();
    await client.halo.createProfile({ username: 'test-user' });
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
