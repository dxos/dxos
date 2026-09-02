//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Tracer from 'effect/Tracer';
import { expect } from 'vitest';

import * as Database from './Database';

const makeRecordingTracer = (spans: Tracer.Span[]) => {
  const base = Effect.runSync(Effect.tracer);
  return Tracer.make({
    span: (...args) => {
      const span = base.span(...args);
      spans.push(span);
      return span;
    },
  });
};

describe('Database.withSpaceId', () => {
  it.effect('stamps the space on the span it opens', () =>
    Effect.gen(function* () {
      const spans: Tracer.Span[] = [];
      yield* Effect.void.pipe(
        Effect.withSpan('Database.test'),
        Database.withSpaceId,
        Effect.provideService(Database.Service, { db: { spaceId: 'B7777777777777777777777777' } } as any),
        Effect.provideService(Tracer.Tracer, makeRecordingTracer(spans)),
      );

      const span = spans.find(({ name }) => name === 'Database.test');
      expect(span?.attributes.get('spaceId')).toEqual('B7777777777777777777777777');
    }),
  );
});
