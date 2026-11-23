//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Spec from '@dxos/compute/Spec';
import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import getSpecBlocks from './get-spec-blocks.ts';

const CONTENT = [
  'An inbox that sorts itself.',
  '',
  '```mdl',
  'feat k7q2x: Sorted inbox',
  '  Mail lands in the folder its sender suggests.',
  '  status: in-progress',
  '',
  "  req m3pza: A message from a known sender goes to that sender's folder.",
  '```',
  '',
  '```mdl',
  'op Sort: Moves a message to its folder',
  '  input:',
  '    message: Message   # the message to sort',
  '```',
].join('\n');

describe('get-spec-blocks', () => {
  it.effect('reads each block with its label and field values', () =>
    Effect.gen(function* () {
      const spec = yield* Database.add(
        Spec.make({ name: 'Inbox', content: CONTENT, dialects: ['org.dxos.spec.software'] }),
      );
      yield* Database.flush();

      const { blocks } = yield* getSpecBlocks.handler({ spec: Ref.make(spec) });
      expect(blocks.map(({ kind, key }) => `${kind} ${key}`)).toEqual(['feat k7q2x', 'op Sort']);
      expect(blocks[0]).toMatchObject({
        label: 'F-1',
        title: 'Sorted inbox',
        prose: 'Mail lands in the folder its sender suggests.',
        fields: {
          status: 'in-progress',
          req: [{ key: 'm3pza', label: 'F-1.1', text: "A message from a known sender goes to that sender's folder." }],
        },
      });
      expect(blocks[1].fields.input).toEqual([
        { name: 'message', optional: false, value: 'Message', note: 'the message to sort' },
      ]);

      const { blocks: features } = yield* getSpecBlocks.handler({ spec: Ref.make(spec), kind: 'feat' });
      expect(features.map(({ key }) => key)).toEqual(['k7q2x']);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Spec.Spec, Text.Text] }))),
  );
});
