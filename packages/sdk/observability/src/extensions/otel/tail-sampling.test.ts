//
// Copyright 2026 DXOS.org
//

import { SpanStatusCode } from '@opentelemetry/api';
import { describe, test } from 'vitest';

import type * as OtelSpanSink from './OtelSpanSink';
import { TailSampler } from './tail-sampling';

/** Trace ids whose low 32 bits sit either side of the 0.3 ratio. */
const KEPT_TRACE = '0'.repeat(24) + '00000000'; // 0.0 -> kept at any positive ratio.
const DROPPED_TRACE = '0'.repeat(24) + 'ffffffff'; // ~1.0 -> dropped below ratio 1.

const span = (overrides: Partial<OtelSpanSink.Span> = {}): OtelSpanSink.Span =>
  ({
    type: 'otel-span',
    name: 'Operation.invoke',
    traceId: DROPPED_TRACE,
    spanId: 'a'.repeat(16),
    status: { code: SpanStatusCode.UNSET },
    attributes: {},
    ...overrides,
  }) as OtelSpanSink.Span;

describe('TailSampler', () => {
  test('keeps a trace the ratio selects, and drops one it does not', ({ expect }) => {
    const sampler = new TailSampler();
    expect(sampler.keep(span({ traceId: KEPT_TRACE }))).toEqual(true);
    expect(sampler.keep(span({ traceId: DROPPED_TRACE }))).toEqual(false);
  });

  test('decides the same way for every span of a trace', ({ expect }) => {
    const sampler = new TailSampler();
    const decisions = [1, 2, 3].map((n) => sampler.keep(span({ traceId: DROPPED_TRACE, spanId: `${n}` })));
    expect(new Set(decisions).size).toEqual(1);
  });

  test('keeps an errored span the ratio would have dropped', ({ expect }) => {
    const sampler = new TailSampler();
    expect(sampler.keep(span({ status: { code: SpanStatusCode.ERROR } }))).toEqual(true);
  });

  test('keeps a model call the ratio would have dropped', ({ expect }) => {
    const sampler = new TailSampler();
    const call = span({ name: 'LanguageModel.streamText', attributes: { 'gen_ai.system': 'anthropic' } });
    expect(sampler.keep(call)).toEqual(true);
  });

  test('keeps the rest of a trace once something in it is promoted', ({ expect }) => {
    const sampler = new TailSampler();
    // A parent ends after its children, so promoting on the error is what keeps the ancestors.
    expect(sampler.keep(span({ status: { code: SpanStatusCode.ERROR }, spanId: 'child' }))).toEqual(true);
    expect(sampler.keep(span({ spanId: 'parent' }))).toEqual(true);
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
