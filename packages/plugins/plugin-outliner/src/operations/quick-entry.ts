//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { getPersonalSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { Filter } from '@dxos/react-client/echo';

import { Journal } from '../types';
import { QuickJournalEntry } from './definitions';

const handler: Operation.WithHandler<typeof QuickJournalEntry> = QuickJournalEntry.pipe(
  Operation.withHandler(({ text }) =>
    Effect.gen(function* () {
      const cleaned = text?.trim();
      if (!cleaned) {
        return;
      }

      const client = yield* Capability.get(ClientCapabilities.Client);
      yield* Effect.tryPromise(async () => {
        const space = getPersonalSpace(client);
        if (!space) {
          return;
        }
        await space.waitUntilReady();

        const journals = await space.db.query(Filter.type(Journal.Journal)).run();
        const journal = journals.length > 0 ? (journals[0] as Journal.Journal) : space.db.add(Journal.make());

        const entry = Journal.getOrCreateEntry(journal, space.db);
        await Journal.addBullet(entry, cleaned);
      });
    }),
  ),
);

export default handler;
