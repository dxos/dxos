//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Tracer from 'effect/Tracer';
import { describe, expect, test } from 'vitest';

import * as SpanAttributes from './SpanAttributes';

const SPACE = 'B7777777777777777777777777';

/** Records every span opened, delegating the span itself to the built-in tracer. */
const recordingTracer = (spans: Tracer.Span[]) => {
  const base = Effect.runSync(Effect.tracer);
  return Tracer.make({
    span: (...args) => {
      const span = base.span(...args);
      spans.push(span);
      return span;
    },
  });
};

describe('SpanAttributes', () => {
  test('withSpace names the space, and names nothing when there is none', () => {
    expect(SpanAttributes.withSpace(SPACE)).toEqual({ attributes: { spaceId: SPACE } });
    expect(SpanAttributes.withSpace(null)).toBeUndefined();
    expect(SpanAttributes.withSpace(undefined)).toBeUndefined();
  });

  test('annotateSpace reaches every span opened inside, and none outside', () => {
    const spans: Tracer.Span[] = [];
    const program = Effect.gen(function* () {
      yield* Effect.void.pipe(Effect.withSpan('outside'));
      yield* Effect.gen(function* () {
        yield* Effect.void.pipe(Effect.withSpan('inner'));
      }).pipe(Effect.withSpan('outer'), SpanAttributes.annotateSpace(SPACE));
      yield* Effect.void.pipe(Effect.withSpan('skipped'), SpanAttributes.annotateSpace(null));
    });
    Effect.runSync(program.pipe(Effect.provideService(Tracer.Tracer, recordingTracer(spans))));

    const space = (name: string) => spans.find((span) => span.name === name)?.attributes.get(SpanAttributes.SPACE_ID);
    expect(space('outer')).toBe(SPACE);
    expect(space('inner')).toBe(SPACE);
    expect(space('outside')).toBeUndefined();
    expect(space('skipped')).toBeUndefined();
  });
});
