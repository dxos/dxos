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

type ConsoleTask = { run: <T>(fn: () => T) => T };

/** Chrome-only `console.createTask`, absent from the standard `Console` typings. */
type ConsoleWithTask = Console & { createTask: (name: string) => ConsoleTask };

type TaskSpan = Tracer.Span & { [runInTask]?: <T>(fn: () => T) => T };

const hasCreateTask = (value: Console): value is ConsoleWithTask => Predicate.hasProperty(value, 'createTask');

/**
 * Traces effect frames using console.createTask so that the proper stack-trace is visible in Chrome Devtools debugger.
 */
export const asyncTaskTaggingLayer = () => {
  if (!hasCreateTask(console)) {
    return Layer.empty;
  }
  const taskConsole = console;

  const makeTracer = Effect.gen(function* () {
    const oldTracer = yield* Effect.tracer;
    return Tracer.make({
      span: (options, ...args) => {
        const span: TaskSpan = oldTracer.span(options, ...args);
        const trace = taskConsole.createTask(options.name);
        span[runInTask] = (fn) => trace.run(fn);
        return span;
      },
      // `context` is optional in v4. Only wrap it when the underlying tracer implements it --
      // supplying our own would otherwise change how effects are evaluated, not just traced.
      ...(oldTracer.context
        ? {
            context: (f, fiber) => {
              const delegate = () => oldTracer.context!(f, fiber);

              const maybeParentSpan = Context.getOption(Tracer.ParentSpan)(fiber.context);
              if (maybeParentSpan._tag === 'None') {
                return delegate();
              }
              const parentSpan = maybeParentSpan.value;
              if (parentSpan._tag === 'ExternalSpan') {
                return delegate();
              }
              const span = parentSpan;
              if (runInTask in span && typeof span[runInTask] === 'function') {
                return span[runInTask](delegate);
              }

              return delegate();
            },
          }
        : {}),
    });
  });
  return pipe(
    makeTracer,
    Effect.map((tracer) => Layer.succeed(Tracer.Tracer, tracer)),
    Layer.unwrap,
  );
};
