//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import { expect, vi } from 'vitest';

import { Event } from '@dxos/async';

import * as Observability from '../Observability.ts';
import * as ObservabilityExtension from '../ObservabilityExtension.ts';
import { editsRejectedProvider } from './client-observability.ts';

/** A space whose database the test can make refuse edits. */
const makeSpace = (id: string) => ({ id, db: { editsRejected: new Event<{ changes: readonly unknown[] }>() } });

describe('editsRejectedProvider', () => {
  it.effect(
    'counts and captures refused edits in every space, including ones joined later, without their content',
    () =>
      Effect.gen(function* () {
        const increment = vi.fn();
        const captureException = vi.fn();
        const extension: ObservabilityExtension.Extension = {
          initialize: () => Effect.void,
          close: () => Effect.void,
          enable: () => Effect.void,
          disable: () => Effect.void,
          flush: () => Effect.void,
          identify: vi.fn(),
          alias: vi.fn(),
          setTags: vi.fn(),
          enabled: true,
          apis: [
            {
              kind: 'metrics',
              isAvailable: () => Effect.succeed(true),
              gauge: vi.fn(),
              increment,
              distribution: vi.fn(),
              observe: vi.fn(() => () => {}),
            },
            { kind: 'errors', isAvailable: () => Effect.succeed(true), captureException },
          ],
        };
        const observability = yield* Function.pipe(
          Observability.make(),
          Observability.addExtension(Effect.succeed(extension)),
          Observability.initialize,
        );

        const first = makeSpace('first');
        const later = makeSpace('later');
        const spaces = [first];
        const observers: ((spaces: readonly (typeof first)[]) => void)[] = [];
        const client = {
          spaces: {
            get: () => spaces,
            subscribe: ({ next }: { next: (spaces: readonly (typeof first)[]) => void }) => {
              observers.push(next);
              return { unsubscribe: () => {} };
            },
          },
        };
        yield* observability.addDataProvider(editsRejectedProvider(client));

        first.db.editsRejected.emit({ changes: [['secret op'], ['another']] });
        spaces.push(later);
        observers.forEach((next) => next(spaces));
        later.db.editsRejected.emit({ changes: [['one more']] });

        expect(increment.mock.calls.map(([name, value]) => [name, value])).toEqual([
          ['dxos.echo.edits.rejected', 2],
          ['dxos.echo.edits.rejected', 1],
        ]);
        expect(captureException).toHaveBeenCalledTimes(2);
        expect(JSON.stringify(captureException.mock.calls)).not.toContain('secret op');
      }),
  );
});
