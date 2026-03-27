//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Filter } from '@dxos/react-client/echo';

import { Journal, JournalOperation, Outline, OutlineOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);

    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: OutlineOperation.CreateOutline,
        handler: ({ name }) =>
          Effect.succeed({
            object: Outline.make({ name }),
          }),
      }),

      OperationResolver.make({
        operation: JournalOperation.QuickEntry,
        handler: ({ text }) =>
          Effect.tryPromise(async () => {
            const space = client.spaces.default;
            await space.waitUntilReady();

            // Find or create a journal in the default space.
            const journals = await space.db.query(Filter.type(Journal.Journal)).run();
            const journal = journals.length > 0
              ? journals[0] as Journal.Journal
              : space.db.add(Journal.make());

            // Get or create today's entry and append the bullet.
            const entry = Journal.getOrCreateEntry(journal, space.db);
            await Journal.addBullet(entry, text);
          }),
      }),
    ]);
  }),
);
