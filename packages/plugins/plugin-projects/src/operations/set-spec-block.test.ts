//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Spec from '@dxos/compute/Spec';
import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import setSpecBlock from './set-spec-block.ts';

const fence = (...lines: string[]) => ['```mdl', ...lines, '```'].join('\n');

const FEATURE = fence(
  'feat k7q2x: Sorted inbox',
  '  status: planned   # until the rules land',
  '',
  "  req m3pza: A message from a known sender goes to that sender's folder.",
);

const make = (content: string) =>
  Effect.gen(function* () {
    const spec = yield* Database.add(Spec.make({ name: 'Inbox', content, dialects: ['org.dxos.spec.software'] }));
    yield* Database.flush();
    const text = yield* Database.load(spec.content);
    return { ref: Ref.make(spec), text };
  });

const layer = TestDatabaseLayer({ types: [Spec.Spec, Text.Text] });

describe('set-spec-block', () => {
  it.effect('changes only the fields given and keeps the rest of the source', () =>
    Effect.gen(function* () {
      const { ref, text } = yield* make(`Intro.\n\n${FEATURE}\n`);

      const result = yield* setSpecBlock.handler({ spec: ref, block: 'F-1', fields: { status: 'operational' } });
      expect(result).toEqual({ key: 'k7q2x', label: 'F-1' });
      expect(text.content).toBe(`Intro.\n\n${FEATURE.replace('planned', 'operational')}\n`);

      yield* setSpecBlock.handler({ spec: ref, block: 'k7q2x', fields: { status: null } });
      expect(text.content).not.toContain('status');
    }).pipe(Effect.provide(layer)),
  );

  it.effect('adds a block after the last of its kind, keying it and its new entries', () =>
    Effect.gen(function* () {
      const { ref, text } = yield* make(`Intro.\n\n${FEATURE}\n\nOutro.\n`);

      const { key, label } = yield* setSpecBlock.handler({
        spec: ref,
        kind: 'feat',
        title: 'Answers',
        fields: { req: [{ text: 'An agent answers a question it can.' }] },
      });
      expect(label).toBe('F-2');
      const [, added] = text.content.split(FEATURE);
      expect(added).toMatch(
        new RegExp(`^\\n\\n\`\`\`mdl\\nfeat ${key}: Answers\\n\\n  req [a-z2-9]{5}: An agent answers`),
      );
      expect(text.content.endsWith('```\n\nOutro.\n')).toBe(true);

      const named = yield* setSpecBlock.handler({ spec: ref, kind: 'op', block: 'Sort', title: 'Moves a message' });
      expect(named).toEqual({ key: 'Sort' });
      expect(text.content).toContain(fence('op Sort: Moves a message'));
    }).pipe(Effect.provide(layer)),
  );

  it.effect('moves a block before the first of its kind', () =>
    Effect.gen(function* () {
      const second = fence('feat w8rtn: Answers');
      const { ref, text } = yield* make([FEATURE, second].join('\n\n'));

      const moved = yield* setSpecBlock.handler({ spec: ref, block: 'w8rtn', after: '' });
      expect(moved).toEqual({ key: 'w8rtn', label: 'F-1' });
      expect(text.content).toBe([second, FEATURE].join('\n\n') + '\n');
    }).pipe(Effect.provide(layer)),
  );

  it.effect('refuses a field its kind does not declare', () =>
    Effect.gen(function* () {
      const { ref, text } = yield* make(FEATURE);

      const error = yield* setSpecBlock.handler({ spec: ref, block: 'F-1', fields: { owner: 'me' } }).pipe(Effect.flip);
      expect(error.message).toBe('feat has no field owner.');
      expect(text.content).toBe(FEATURE);
    }).pipe(Effect.provide(layer)),
  );
});
