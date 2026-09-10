//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Tracer from 'effect/Tracer';

import { Context, TRACE_SPAN_ATTRIBUTE } from '@dxos/context';

import { withContext } from './internal/context';

const TRACE_ID = 'bbbb0000bbbb0000bbbb0000bbbb0000';
const SPAN_ID = 'cccc0000cccc0000';

describe('withContext', () => {
  it.effect(
    'adopts the context trace identity as the parent span',
    Effect.fn(function* ({ expect }) {
      const ctx = new Context({
        attributes: { [TRACE_SPAN_ATTRIBUTE]: { traceparent: `00-${TRACE_ID}-${SPAN_ID}-01` } },
      });

      const parent = yield* Effect.serviceOption(Tracer.ParentSpan).pipe(withContext(ctx));
      expect(parent._tag).to.equal('Some');
      expect(parent._tag === 'Some' && parent.value.spanId).to.equal(SPAN_ID);
      expect(parent._tag === 'Some' && parent.value.traceId).to.equal(TRACE_ID);
    }),
  );

  it.effect(
    'leaves the parent span alone when the context carries no trace',
    Effect.fn(function* ({ expect }) {
      const parent = yield* Effect.serviceOption(Tracer.ParentSpan).pipe(withContext(new Context()));
      expect(parent._tag).to.equal('None');
    }),
  );

  it.effect(
    'interrupts when the context is disposed',
    Effect.fn(function* ({ expect }) {
      const ctx = new Context();
      const fiber = yield* Effect.forkChild(Effect.never.pipe(withContext(ctx)));
      yield* Effect.promise(() => ctx.dispose());
      expect(Exit.hasInterrupts(yield* Fiber.await(fiber))).to.be.true;
    }, Effect.scoped),
  );

  it.effect(
    'removes its dispose subscription once the effect completes',
    Effect.fn(function* ({ expect }) {
      const ctx = new Context();
      const before = ctx.disposeCallbacksLength;
      for (let i = 0; i < 10; i++) {
        yield* Effect.void.pipe(withContext(ctx));
      }
      expect(ctx.disposeCallbacksLength).to.equal(before);
    }),
  );
});
