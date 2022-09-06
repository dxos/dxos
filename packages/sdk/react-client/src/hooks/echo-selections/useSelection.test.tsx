//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import 'raf/polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import waitForExpect from 'wait-for-expect';

import { Party } from '@dxos/client';
import { Client } from '@dxos/client/client';

import { useSelection } from './useSelection';

const count = 10;
const TYPE_EXAMPLE = 'example:type/org';

const createTestComponents = async () => {
  const config = {};
  const client = new Client(config);
  await client.initialize();
  await client.halo.createProfile();

  const party = await client.echo.createParty();
  const items = await Promise.all(Array.from({ length: count }).map(async () => await party.database.createItem({ type: TYPE_EXAMPLE })));
  expect(items.length).toBe(count);

  return { client, party };
};

const UseSelectionTestComponent = ({ party }: { party: Party}) => {
  const items = useSelection(party?.select().filter({ type: TYPE_EXAMPLE }), []);

  const addItem = async () => await party.database.createItem({ type: TYPE_EXAMPLE });

  return (
    <ul onClick={addItem}>
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

describe('useSelection', () => {
  it('gets updated items selection', async () => {
    const { party } = await createTestComponents();
    act(() => {
      ReactDOM.render(<UseSelectionTestComponent party={party} />, rootContainer);
    });

    const ul = rootContainer.querySelector('ul');
    await waitForExpect(() => {
      expect(ul.childNodes.length).toEqual(count);
    });
    ul.click();
    await waitForExpect(() => {
      expect(ul.childNodes.length).toEqual(count + 1);
    });
  });
});
