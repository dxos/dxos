//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Tracer from 'effect/Tracer';
import { describe, expect, test } from 'vitest';

import * as SpanAttributes from './SpanAttributes';
import { makeRecordingTracer } from './testing';

const SPACE = 'B7777777777777777777777777';

describe('SpanAttributes', () => {
  test('annotateSpace reaches every span opened inside, forks included, and none outside', () => {
    const spans: Tracer.Span[] = [];
    const program = Effect.gen(function* () {
      yield* Effect.void.pipe(Effect.withSpan('outside'));
      yield* Effect.gen(function* () {
        yield* Effect.void.pipe(Effect.withSpan('inner'));
        yield* Effect.void.pipe(Effect.withSpan('forked'), Effect.forkChild, Effect.flatMap(Fiber.join));
      }).pipe(Effect.withSpan('outer'), SpanAttributes.annotateSpace(SPACE));
      yield* Effect.void.pipe(Effect.withSpan('skipped'), SpanAttributes.annotateSpace(null));
    });
    Effect.runSync(program.pipe(Effect.provideService(Tracer.Tracer, makeRecordingTracer(spans))));

    const space = (name: string) => spans.find((span) => span.name === name)?.attributes.get(SpanAttributes.SPACE_ID);
    expect(space('outer')).toBe(SPACE);
    expect(space('inner')).toBe(SPACE);
    expect(space('forked')).toBe(SPACE);
    expect(space('outside')).toBeUndefined();
    expect(space('skipped')).toBeUndefined();
  });
});
