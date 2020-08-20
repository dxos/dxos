//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import ram from 'random-access-memory';

import { humanize } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { Database } from './database';
import { Party } from './parties';
import { TestModel } from './testing';
import { ModelFactory } from './models';
import { codec, jsonReplacer } from './proto';
import { createLoggingTransform, latch } from './util';

const log = debug('dxos:echo:database:test');
debug.enable('dxos:echo:*');

describe('api tests', () => {
  test('create party and items.', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const modelFactory = new ModelFactory().registerModel(TestModel.type, TestModel);

    const options = {
      readLogger: createLoggingTransform((message: any) => { log('>>>', JSON.stringify(message, jsonReplacer, 2)); }),
      writeLogger: createLoggingTransform((message: any) => { log('<<<', JSON.stringify(message, jsonReplacer, 2)); })
    };

    const db = new Database(feedStore, modelFactory, options);
    await db.open();

    const parties = await db.queryParties({ open: true });
    log('Parties:', parties.value.map(party => humanize(party.key)));
    expect(parties.value).toHaveLength(0);

    const [updated, onUpdate] = latch();
    const unsubscribe = parties.subscribe(async (parties: Party[]) => {
      log('Updated:', parties.map(party => humanize(party.key)));
      expect(parties).toHaveLength(1);
      parties.map(async party => {
        const items = await party.queryItems();
        items.value.forEach(item => {
          log('Item:', String(item));
        });

        const result = await party.queryItems({ type: 'drn://dxos.org/item/document' });
        expect(result.value).toHaveLength(2);

        const value = await party.getProperty('title');
        expect(value).toBe('DXOS');
      });

      onUpdate();
    });

    const party = await db.createParty();
    expect(party.isOpen).toBeTruthy();

    // Properties.
    await party.setProperty('title', 'DXOS');

    // TODO(burdon): Test item mutations.
    await party.createItem('drn://dxos.org/item/document', TestModel.type);
    await party.createItem('drn://dxos.org/item/document', TestModel.type);
    await party.createItem('drn://dxos.org/item/kanban', TestModel.type);

    await updated;
    unsubscribe();
  });
});
