//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import 'raf/polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import waitForExpect from 'wait-for-expect';

import { Client, Party } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';

import { ClientProvider } from '../../containers';
import { useClient } from '../client';
import { useSelection } from './useSelection';

const useTestParty = async () => {
  const config = {};
  const client = new Client(config);
  await client.initialize();
  await client.halo.createProfile();

  const party = await client.echo.createParty();
  const items = await Promise.all(Array.from({ length: 10 }).map(async () => {
    return await party.database.createItem({
      type: 'example:type/person',
      props: {}
    });
  }));
  expect(items.length).toBe(10);

  return { client, party };
};

const ClientTestComponent = () => {
  const client = useClient();
  return (
    <h1>{client.version}</h1>
  );
};

const UseSelectionTestComponent = ({
  party
}: { party: Party}) => {
  const items = useSelection(party?.select(), []);

  useAsyncEffect(async () => {
    await party.database.createItem({
      type: 'example:type/person',
      props: {}
    });
  }, []);

  return (
    <ul>
      {items?.map(item => <li key={item.id}>{item.id}</li>)}
    </ul>
  );
};

let rootContainer: any;

beforeEach(() => {
  rootContainer = document.createElement('div');
  document.body.appendChild(rootContainer);
});

afterEach(() => {
  document.body.removeChild(rootContainer);
  rootContainer = null;
});

describe.only('useSelection', () => {
  it('creates a client', async () => {
    const { client } = await useTestParty();
    act(() => {
      ReactDOM.render((
        <ClientProvider client={client}>
          <ClientTestComponent />
        </ClientProvider>
      ), rootContainer);
    });

    const h1 = document.querySelector('h1');
    await waitForExpect(() => {
      expect(h1?.textContent?.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('gets updated items selection', async () => {
    const { party } = await useTestParty();
    act(() => {
      ReactDOM.render(<UseSelectionTestComponent party={party} />, rootContainer);
    });

    const ul = rootContainer.querySelector('ul');
    await waitForExpect(() => {
      expect(ul.childNodes.length).toEqual(11);
    });
  });
});
