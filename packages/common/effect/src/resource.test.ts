//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import { Effect } from 'effect';

import { accuireReleaseResource } from './resource';

it.effect(
  'acquire-release',
  Effect.fn(function* ({ expect }) {
    const events: string[] = [];

    const makeResource = accuireReleaseResource(() => ({
      open: () => {
        events.push('open');
      },
      close: () => {
        events.push('close');
      },
    }));
    yield* Effect.gen(function* () {
      events.push('1');
      const _resource = yield* makeResource;
      events.push('2');
    }).pipe(Effect.scoped);
    events.push('3');
    expect(events).to.deep.equal(['1', 'open', '2', 'close', '3']);
  }),
);
