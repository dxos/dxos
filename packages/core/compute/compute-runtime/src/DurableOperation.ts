//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Semaphore from 'effect/Semaphore';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as StorageService from '@dxos/compute/StorageService';
import * as Trace from '@dxos/compute/Trace';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

/**
 * Durable marker recording that an operation's input handler has begun executing.
 * Persisted before the handler runs so that, after an interruption (suspend/restart), a
 * re-delivered input can tell that the previous attempt was in-flight. Cleared automatically
 * when the process reaches a terminal state (the runtime clears the process's storage).
 */
const OperationStartedCell = StorageService.cell(Schema.fromJsonString(Schema.Boolean), 'operation/started').pipe(
  StorageService.withDefault(() => false),
);

/**
 * Runs a (non-durable) operation as a durable one: a single-input process that invokes the operation's handler.
 *
 * The handler is looked up when the input arrives, so the process requires the services the definition declares.
 * Prefer {@link resolve} where the handler set may hold an implementation that needs different ones.
 */
export const fromOperation = <const Op extends Operation.Definition.Any>(
  op: Op,
  handlers: OperationHandlerSet.OperationHandlerSet,
): Operation.Durable<
  Operation.Definition.Input<Op>,
  Operation.Definition.Output<Op>,
  Operation.Definition.Services<Op>
> => make(op, op.services, OperationHandlerSet.getHandler(handlers, op).pipe(Effect.orDie));

/**
 * Runs an already-resolved handler as a durable operation; the process requires the services that
 * implementation declares, which for a body dispatched to another runtime (EDGE's operation-service) are none.
 */
export const fromHandler = <
  const Op extends Operation.Definition.Any,
  const Impl extends Operation.WithHandler<Operation.Definition.Any>,
>(
  op: Op,
  handler: Impl,
): Operation.Durable<
  Operation.Definition.Input<Op>,
  Operation.Definition.Output<Op>,
  Operation.Definition.Services<Impl>
> => make(op, handler.services, Effect.succeed(handler));

/**
 * Resolves the operation's handler before spawning, so the process requires only what the implementation needs.
 * A missing handler keeps failing inside the process, as {@link fromOperation} does.
 */
export const resolve = <const Op extends Operation.Definition.Any>(
  op: Op,
  handlers: OperationHandlerSet.OperationHandlerSet,
): Effect.Effect<
  Operation.Durable<Operation.Definition.Input<Op>, Operation.Definition.Output<Op>, Operation.Definition.Services<Op>>
> =>
  Effect.promise(() => OperationHandlerSet.findHandler(handlers, op)).pipe(
    Effect.map((handler) => (handler ? fromHandler(op, handler) : fromOperation(op, handlers))),
  );

const make = <const Op extends Operation.Definition.Any, R>(
  op: Op,
  services: readonly Context.Key<any, any>[],
  getHandler: Effect.Effect<Operation.WithHandler<Operation.Definition.Any>>,
): Operation.Durable<Operation.Definition.Input<Op>, Operation.Definition.Output<Op>, R> =>
  Operation.makeDurable(
    {
      key: DXN.getName(op.meta.key),
      input: op.input,
      output: op.output,
      services,
    },
    (ctx) =>
      Effect.gen(function* () {
        const semaphore = yield* Semaphore.make(1);
        // The process runtime assumes handlers are idempotent and always re-delivers an input
        // whose handler was interrupted. Non-idempotent operations opt out of that retry here:
        // a re-delivery that observes the durable "started" marker fails instead of repeating
        // side effects. Idempotent operations skip the marker and are simply re-run.
        const idempotent = Operation.isIdempotent(op);

        return {
          onInput: (input: Operation.Definition.Input<Op>) =>
            Effect.gen(function* () {
              if (!idempotent) {
                const started = yield* OperationStartedCell.get;
                if (started) {
                  return yield* Effect.die(
                    new Error(`non-idempotent operation "${op.meta.key}" was interrupted; cannot retry safely`),
                  );
                }
                yield* OperationStartedCell.set(true);
              }

              // Emit operation start event.
              log('operation process invoking', { key: op.meta.key, name: op.meta.name });
              yield* Trace.write(Trace.OperationStart, {
                key: op.meta.key,
                name: op.meta.name,
                icon: op.meta.icon,
              });
              // Emit ephemeral operation input event for live subscribers
              // (history tracker, devtools) without persisting raw input.
              yield* Trace.write(Trace.OperationInput, {
                key: op.meta.key,
                name: op.meta.name,
                input,
              });

              // A property the schema does not declare is a caller mistake, not a value to drop:
              // a misspelled field left `query-objects` with no `text` and no `typename`, which
              // its handler read as "match everything" and returned as a successful search. The
              // edge path validates the same way in `wrapFunctionHandler`; validating here too
              // keeps a local invocation and a remote one to one contract.
              yield* validateOperationInput(op, input);

              const opHandler = yield* getHandler;
              const output = yield* opHandler
                .handler(input)
                .pipe(Effect.orDie, Effect.withSpan(op.meta.key)) as Effect.Effect<
                Operation.Definition.Output<Op>,
                never,
                never
              >;

              ctx.submitOutput(output);
              ctx.succeed();

              // Emit ephemeral operation output event before the persisted
              // end event so subscribers see output + completion together.
              yield* Trace.write(Trace.OperationOutput, {
                key: op.meta.key,
                name: op.meta.name,
                output,
              });
              // Emit operation end event with success after side-effects complete.
              yield* Trace.write(Trace.OperationEnd, {
                key: op.meta.key,
                name: op.meta.name,
                icon: op.meta.icon,
                outcome: 'success',
              });
            }).pipe(
              Effect.catchDefect((defect) =>
                Effect.gen(function* () {
                  // Emit operation end event with failure. Carry the error's stable name as `errorCode`
                  // so consumers can match on the failure kind (e.g. a run-again yield) without parsing
                  // the message.
                  const errorMessage = defect instanceof Error ? defect.message : String(defect);
                  const errorCode = defect instanceof Error ? defect.name : undefined;
                  yield* Trace.write(Trace.OperationEnd, {
                    key: op.meta.key,
                    name: op.meta.name,
                    icon: op.meta.icon,
                    outcome: 'failure',
                    error: errorMessage,
                    ...(errorCode ? { errorCode } : {}),
                  });
                  return yield* Effect.die(defect);
                }),
              ),
              semaphore.withPermits(1),
            ),
        };
      }),
  );

/**
 * Reject an operation input the operation's own schema does not admit, naming the offending value.
 *
 * The excess-property check is deliberately top-level only: a misspelled field is the mistake worth
 * catching, and an in-process caller legitimately passes a LIVE ECHO object as a property value,
 * which carries internal keys no declared schema lists. `reportInput` and `errors: 'all'` put the
 * rejected value and every bad field in the message, since a remote caller cannot see its own
 * payload in our logs.
 */
const validateOperationInput = <const Op extends Operation.Definition.Any>(
  op: Op,
  input: unknown,
): Effect.Effect<void> => {
  // An input schema that describes no shape cannot say what an excess property would be, and a
  // caller handing a payload to an operation declaring `Void` is the trigger dispatcher's normal
  // contract. `Null` is in the set because a `Void` input comes back as `Null` once the operation
  // has round-tripped through its serialized schema, which is how the dispatcher rebuilds it.
  const typeAst = Schema.toType(op.input).ast;
  if (CONTENTLESS_INPUT_TAGS.has(typeAst._tag)) {
    return Effect.void;
  }

  const fail = (message: string, cause?: unknown) =>
    new Operation.InvalidOperationInputError({
      message: `Operation input did not match schema (${op.meta.key}): ${message}`,
      cause,
    });

  // Invoking with no arguments is how a skill template and the trigger dispatcher call an operation
  // whose fields are all optional, so a nullish payload is validated as the empty object it stands
  // for rather than rejected outright; a schema that does require fields still names them.
  const payload = input ?? (SchemaAST.isObjects(typeAst) ? {} : input);

  return Effect.suspend(() => {
    const undeclared = undeclaredTopLevelKeys(typeAst, payload);
    if (undeclared.length > 0) {
      return Effect.die(
        fail(`unexpected ${undeclared.length === 1 ? 'property' : 'properties'} ${undeclared.join(', ')}`),
      );
    }

    return Effect.try({
      try: () => Schema.decodeUnknownSync(Schema.toType(op.input), { reportInput: true, errors: 'all' })(payload),
      catch: (error: any) => fail(error?.message ?? String(error), error),
    }).pipe(Effect.asVoid, Effect.orDie);
  });
};

/** Own keys of a struct input that the schema does not declare; empty for any other input shape. */
const undeclaredTopLevelKeys = (typeAst: SchemaAST.AST, input: unknown): string[] => {
  if (!SchemaAST.isObjects(typeAst) || typeof input !== 'object' || input === null || Array.isArray(input)) {
    return [];
  }
  // An index signature makes every key declared, so there is nothing to reject.
  if (typeAst.indexSignatures.length > 0) {
    return [];
  }

  const declared = new Set(SchemaAST.getPropertySignatures(typeAst).map((prop) => prop.name.toString()));
  return Object.keys(input).filter((key) => !declared.has(key));
};

const CONTENTLESS_INPUT_TAGS: ReadonlySet<string> = new Set(['Any', 'Unknown', 'Void', 'Undefined', 'Null', 'Never']);
