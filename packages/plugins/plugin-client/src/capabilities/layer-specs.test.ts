//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Fact, MemoryQuery, MemoryService } from '@dxos/echo-memory';
// Resolves to `plugin.node.ts` under the source condition vitest uses.
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import { ClientCapabilities } from '#types';

await Harness.preload({ plugins: [ClientPlugin.make({})] });

describe('MemoryService layer', () => {
  test('an operation asking for MemoryService gets the memory of its space', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [ClientPlugin.make({})] });
    const client = harness.get(ClientCapabilities.Client);
    await client.waitUntilInitialized();
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    await space.waitUntilReady();

    // Resolved the way the operation runtime resolves an operation's declared `services`.
    const facts = await harness.runPromise(
      Effect.gen(function* () {
        const memory = yield* ServiceResolver.resolve(MemoryService.MemoryService, { space: space.id });
        yield* memory.put([
          Fact.make({
            id: 'f1',
            assertion: {
              subject: { kind: 'entity', entity: 'dima' },
              predicate: 'works on',
              object: { kind: 'entity', entity: 'indexer' },
            },
            factuality: { value: 'CT+', polarity: '+' },
            attribution: { agent: 'dima', source: 'chat:general/f1', generatedAtTime: new Date().toISOString() },
            recordedAt: new Date().toISOString(),
            extractor: { id: 'test', model: 'none', version: '1' },
            sourceHash: 'f1',
          }),
        ]);
        return yield* memory.query(MemoryQuery.facts({ entity: Fact.EntityKey.make('indexer') }));
      }).pipe(Effect.scoped),
    );
    expect(facts).toHaveLength(1);
  });
});
