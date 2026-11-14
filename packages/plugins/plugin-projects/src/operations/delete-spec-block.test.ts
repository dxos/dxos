//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Spec from '@dxos/compute/Spec';
import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import deleteSpecBlock from './delete-spec-block.ts';

const fence = (...lines: string[]) => ['```mdl', ...lines, '```'].join('\n');

describe('delete-spec-block', () => {
  it.effect('removes the block a label names and the blank lines after it', () =>
    Effect.gen(function* () {
      const content = ['Intro.', fence('feat a2b3c: One', '  req d4e5f: First.'), fence('feat g6h7i: Two')].join(
        '\n\n',
      );
      const spec = yield* Database.add(Spec.make({ name: 'Spec', content, dialects: ['org.dxos.spec.software'] }));
      yield* Database.flush();

      yield* deleteSpecBlock.handler({ spec: Ref.make(spec), block: 'F-1' });
      const text = yield* Database.load(spec.content);
      expect(text.content).toBe(['Intro.', fence('feat g6h7i: Two')].join('\n\n'));

      yield* deleteSpecBlock.handler({ spec: Ref.make(spec), block: 'g6h7i' });
      expect(text.content).toBe('Intro.\n');

      const missing = yield* deleteSpecBlock.handler({ spec: Ref.make(spec), block: 'F-1' }).pipe(Effect.flip);
      expect(missing.message).toBe('No block F-1.');
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Spec.Spec, Text.Text] }))),
  );
});
