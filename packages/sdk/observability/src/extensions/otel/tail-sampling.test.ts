//
// Copyright 2026 DXOS.org
//

import { SpanStatusCode } from '@opentelemetry/api';
import { describe, test } from 'vitest';

import { type Decidable, DEFAULT_SLOW_MS, TailSampler } from './tail-sampling';

/** Trace ids whose low 32 bits sit either side of the 0.3 ratio. */
const KEPT_TRACE = '0'.repeat(24) + '00000000'; // 0.0 -> kept at any positive ratio.
const DROPPED_TRACE = '0'.repeat(24) + 'ffffffff'; // ~1.0 -> dropped below ratio 1.

const span = (overrides: Partial<Decidable> = {}): Decidable => ({
  traceId: DROPPED_TRACE,
  status: { code: SpanStatusCode.UNSET },
  attributes: {},
  durationMs: 1,
  ...overrides,
});

describe('TailSampler', () => {
  test('keeps a trace the ratio selects, and drops one it does not', ({ expect }) => {
    const sampler = new TailSampler();
    expect(sampler.keep(span({ traceId: KEPT_TRACE }))).toEqual(true);
    expect(sampler.keep(span({ traceId: DROPPED_TRACE }))).toEqual(false);
  });

  test('decides the same way for every span of a trace', ({ expect }) => {
    const sampler = new TailSampler();
    const decisions = [1, 2, 3].map((n) => sampler.keep(span({ traceId: DROPPED_TRACE })));
    expect(new Set(decisions).size).toEqual(1);
  });

  test('keeps an errored span the ratio would have dropped', ({ expect }) => {
    const sampler = new TailSampler();
    expect(sampler.keep(span({ status: { code: SpanStatusCode.ERROR } }))).toEqual(true);
  });

  test('keeps a model call the ratio would have dropped', ({ expect }) => {
    const sampler = new TailSampler();
    expect(sampler.keep(span({ attributes: { 'gen_ai.system': 'anthropic' } }))).toEqual(true);
  });

  test('keeps a span slower than the threshold', ({ expect }) => {
    expect(new TailSampler().keep(span({ durationMs: DEFAULT_SLOW_MS + 1 }))).toEqual(true);
  });

  test('leaves a merely slow span to the ratio', ({ expect }) => {
    // A model call runs for tens of seconds legitimately, which is why the threshold is set at a
    // hang rather than the 5s the Collector's examples use. Its own sampler: the case above would
    // otherwise have promoted this trace.
    expect(new TailSampler().keep(span({ durationMs: 5_000 }))).toEqual(false);
  });

  test('keeps the rest of a trace once something in it is promoted', ({ expect }) => {
    const sampler = new TailSampler();
    // A parent ends after its children, so promoting on the error is what keeps the ancestors.
    expect(sampler.keep(span({ status: { code: SpanStatusCode.ERROR } }))).toEqual(true);
    expect(sampler.keep(span())).toEqual(true);
  });

  test('promotes only the trace that carried the error', ({ expect }) => {
    const sampler = new TailSampler();
    sampler.keep(span({ status: { code: SpanStatusCode.ERROR } }));
    expect(sampler.keep(span({ traceId: '1'.repeat(24) + 'ffffffff' }))).toEqual(false);
  });

  test('forgets the oldest trace once the bound is reached', ({ expect }) => {
    const sampler = new TailSampler({ maxTrackedTraces: 1 });
    const first = '1'.repeat(24) + 'ffffffff';
    const second = '2'.repeat(24) + 'ffffffff';
    sampler.keep(span({ traceId: first, status: { code: SpanStatusCode.ERROR } }));
    sampler.keep(span({ traceId: second, status: { code: SpanStatusCode.ERROR } }));

    // Evicted rather than dropped outright: the trace falls back to the ratio, which rejects this id.
    expect(sampler.keep(span({ traceId: first }))).toEqual(false);
    expect(sampler.keep(span({ traceId: second }))).toEqual(true);
  });

  test('keeps everything at ratio 1', ({ expect }) => {
    const sampler = new TailSampler({ ratio: 1 });
    expect(sampler.keep(span({ traceId: DROPPED_TRACE }))).toEqual(true);
  });
});
