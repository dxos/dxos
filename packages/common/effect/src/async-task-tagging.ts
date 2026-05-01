//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import * as Tracer from 'effect/Tracer';

const runInTask = Symbol('runInTask');

/**
 * Traces effect frames using console.createTask so that the proper stack-trace is visible in Chrome Devtools debugger.
 */
export const asyncTaskTaggingLayer = () => {
  if (Predicate.hasProperty(console, 'createTask') === false) {
    return Layer.empty;
  }

  const makeTracer = Effect.gen(function* () {
    const oldTracer = yield* Effect.tracer;
    return Tracer.make({
      span: (name, ...args) => {
        const span = oldTracer.span(name, ...args);
        const trace = (console as any).createTask(name);
        (span as any)[runInTask] = (f: any) => trace.run(f);
        return span;
      },
      context: (f, fiber) => {
        const maybeParentSpan = Context.getOption(Tracer.ParentSpan)(fiber.currentContext);

        if (maybeParentSpan._tag === 'None') {return oldTracer.context(f, fiber);}
        const parentSpan = maybeParentSpan.value;
        if (parentSpan._tag === 'ExternalSpan') {return oldTracer.context(f, fiber);}
        const span = parentSpan;
        if (runInTask in span && typeof span[runInTask] === 'function') {
          return span[runInTask](() => oldTracer.context(f, fiber));
        }

        return oldTracer.context(f, fiber);
      },
    });
  });
  return pipe(makeTracer, Effect.map(Layer.setTracer), Layer.unwrapEffect);
};
