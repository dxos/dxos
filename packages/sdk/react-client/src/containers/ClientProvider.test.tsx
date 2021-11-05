//
// Copyright 2020 DXOS.org
//

import { screen, render } from '@testing-library/react';
// code import '@testing-library/jest-dom/extend-expect';
import React from 'react';

import { Client } from '@dxos/client';

import { useClient } from '../hooks';
import { ClientProvider } from './ClientProvider';

const TestComponent = () => {
  const client = useClient();
  return (
    <>
      <div>Hello World</div>
      <div>{`Client is ${client ? 'defined' : 'NOT there'}`}</div>
    </>
  );
};

describe('ClientProvider', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client();
    await client.initialize();
    await client.halo.createProfile({ username: 'test-user' });
    await client.echo.open();
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

    expect(() => screen.getByText('Hello World')).not.toThrow();
  });

  test('Provides the client', async () => {
    render(
      <ClientProvider client={client}>
        <TestComponent />
      </ClientProvider>
    );

    expect(() => screen.getByText('Client is defined')).not.toThrow();
    expect(() => screen.getByText('Client is NOT there')).toThrow();
  });
});
