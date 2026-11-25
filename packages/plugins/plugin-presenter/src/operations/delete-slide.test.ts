//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Text } from '@dxos/schema';

import { Presentation } from '#types';

import { OperationTestLayer } from './operation-test-layer.ts';

const uris = (presentation: Presentation.Presentation) => presentation.slides.map((ref) => ref.uri);

// The navtree's Delete on a slide is the space's RemoveObjects, which knows nothing of presentations.
describe('deleting a slide', () => {
  it.effect(
    'drops it from the presentation, and undo puts it back in place with its content',
    Effect.fnUntraced(
      function* ({ expect }) {
        const presentation = yield* Database.add(
          Presentation.make({ name: 'Deck', slides: ['# One', '# Two', '# Three'] }),
        );
        yield* Database.flush();
        const [first, second, third] = yield* Effect.forEach(presentation.slides, (ref) => Database.load(ref));
        const content = yield* Database.load(second.content);

        const removed = yield* Operation.invoke(SpaceOperation.RemoveObjects, { objects: [second] });
        yield* Database.flush();
        expect(uris(presentation)).toEqual([first, third].map((slide) => Ref.make(slide).uri));

        yield* Operation.invoke(SpaceOperation.RestoreObjects, removed);
        yield* Database.flush();
        expect(uris(presentation)).toEqual([first, second, third].map((slide) => Ref.make(slide).uri));
        const restored = yield* Database.load(presentation.slides[1]);
        const restoredContent = yield* Database.load(restored.content);
        expect(restoredContent.id).toBe(content.id);
        expect(Obj.instanceOf(Text.Text, restoredContent) && restoredContent.content).toBe('# Two');
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
