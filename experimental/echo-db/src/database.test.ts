//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import ram from 'random-access-memory';

import { humanize } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { createLoggingTransform, latch, jsonReplacer } from '@dxos/experimental-util';

import { codec } from './codec';
import { Database } from './database';
import { Party } from './parties';

const log = debug('dxos:echo:database:test');
debug.enable('dxos:*:error,dxos:echo:*');

describe('api tests', () => {
  // TODO(burdon): Separate test to update party properties.
  test('create party and items.', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });

    const modelFactory = new ModelFactory()
      .registerModel(ObjectModel.meta, ObjectModel);

    const verbose = true;
    const options = verbose ? {
      readLogger: createLoggingTransform((message: any) => { log('>>>', JSON.stringify(message, jsonReplacer, 2)); }),
      writeLogger: createLoggingTransform((message: any) => { log('<<<', JSON.stringify(message, jsonReplacer, 2)); })
    } : undefined;

    const db = new Database(feedStore, modelFactory, options);
    await db.open();

    const parties = await db.queryParties({ open: true });
    log('Parties:', parties.value.map(party => humanize(party.key)));
    expect(parties.value).toHaveLength(0);

    const [updated, onUpdate] = latch();
    const unsubscribe = parties.subscribe(async (parties: Party[]) => {
      log('Updated:', parties.map(party => humanize(party.key)));

      // TODO(burdon): Update currently called after all mutations below have completed?
      expect(parties).toHaveLength(1);
      parties.map(async party => {
        const items = await party.queryItems();
        items.value.forEach(item => {
          log('Item:', String(item));
        });

        // TODO(burdon): Check item mutations.
        const result = await party.queryItems({ type: 'wrn://dxos.org/item/document' });
        expect(result.value).toHaveLength(2);

        const value = await party.getProperty('title');
        expect(value).toBe('DXOS');

        onUpdate();
      });
    });

    const party = await db.createParty();
    expect(party.isOpen).toBeTruthy();

    // Properties.
    await party.setProperty('title', 'DXOS');

    // TODO(burdon): Test item mutations.
    await party.createItem('wrn://dxos.org/item/document');
    await party.createItem('wrn://dxos.org/item/document');
    await party.createItem('wrn://dxos.org/item/kanban');

    await updated;
    unsubscribe();
  });
});
