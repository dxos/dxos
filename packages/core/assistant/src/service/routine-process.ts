//
// Copyright 2026 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, OpaqueToolkit, type ModelName } from '@dxos/ai';
import { Routine, Template } from '@dxos/compute';
import { Trace } from '@dxos/compute';
import { Operation, OperationRegistry } from '@dxos/compute';
import { Database, DXN, Feed, Obj, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { Process, StorageService } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { type McpServerConfig, AiSession } from '../conversation';
import { RoutineError } from '../errors';
import { getOperationFromTool, makeToolExecutionService, makeToolResolverFromOperations } from '../functions';

export const ROUTINE_PROCESS_KEY = 'org.dxos.process.routine';

export const RoutineRunInput = Schema.Struct({
  routineDxn: Schema.String,
  feedDxn: Schema.String,
  input: Schema.optional(Schema.Any),
  systemInstructions: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
});
export type RoutineRunInput = Schema.Schema.Type<typeof RoutineRunInput>;

const RoutineRunOutput = Schema.Union(
  Schema.TaggedStruct('success', { value: Schema.Any }),
  Schema.TaggedStruct('failure', {
    message: Schema.String,
    description: Schema.optional(Schema.String),
  }),
);
export type RoutineRunOutput = Schema.Schema.Type<typeof RoutineRunOutput>;

interface RoutineProcessOptions {
  getMcpServers?: () => McpServerConfig[];
}

/**
 * One-shot process that executes a Routine and terminates.
 * Emits a single {@link RoutineRunOutput} and succeeds.
 */
export const RoutineProcess = (options: RoutineProcessOptions = {}) =>
  Process.make(
    {
      key: ROUTINE_PROCESS_KEY,
      input: Schema.String,
      output: RoutineRunOutput,
      services: [
        Database.Service,
        OpaqueToolkit.OpaqueToolkitProvider,
        Operation.Service,
        OperationRegistry.Service,
        StorageService.StorageService,
        Feed.FeedService,
        AiService.AiService,
      ],
    },
    (ctx) =>
      Effect.gen(function* () {
        return {
          onInput: Effect.fnUntraced(
            function* (encodedInput: string) {
              const runInput = yield* Schema.decodeUnknown(Schema.parseJson(RoutineRunInput))(encodedInput).pipe(
                Effect.orDie,
              );

              log.info('routine process: received input', { routineDxn: runInput.routineDxn });

              const routine = yield* Database.resolve(DXN.parse(runInput.routineDxn), Routine.Routine).pipe(
                Effect.orDie,
              );
              const feed = yield* Database.resolve(DXN.parse(runInput.feedDxn), Feed.Feed).pipe(Effect.orDie);

              const blueprints = yield* Function.pipe(
                routine.blueprints,
                Effect.forEach(Database.loadOption),
                Effect.map(Array.filter(Option.isSome)),
                Effect.map(Array.map((opt) => opt.value)),
              );

              const objects = yield* Function.pipe(
                routine.context,
                Effect.forEach(Database.loadOption),
                Effect.map(Array.filter(Option.isSome)),
                Effect.map(Array.map((opt) => opt.value)),
              );

              const promptInstructions = yield* Database.load(routine.instructions.source).pipe(Effect.orDie);
              let promptText = Template.process(promptInstructions.content, runInput.input);
              if (runInput.input !== undefined) {
                promptText += `\n<input>${JSON.stringify(runInput.input)}</input>`;
              }

              let systemText = trim`
                You are an agent running in the non-interactive mode.
                The user is unable to see what you are doing, and cannot answer any questions.
                Do not ask questions.
                Complete the task before you, and at the end call [completeJob] with the output.
                If you are unable to complete the task, call [completeJob] with the failure reason.
                If no output is required, call [completeJob] with an empty object: {}
                Do not stop until you call [completeJob].
              `;
              if (runInput.systemInstructions) {
                systemText += `\n\n${runInput.systemInstructions}`;
              }

              const modelLayer = AiService.model((runInput.model as ModelName) ?? '@anthropic/claude-opus-4-6');

              const runtime = yield* Effect.runtime<Feed.FeedService>();
              const session = yield* acquireReleaseResource(() => new AiSession({ feed, runtime }));

              yield* Effect.promise(() =>
                session.context.bind({
                  blueprints: blueprints.map((blueprint) => Ref.make(blueprint)),
                  objects: objects.map((object) => Ref.make(object as Obj.Unknown)),
                }),
              );

              const resultSink = yield* Deferred.make<unknown, RoutineError>();

              const completeJobToolkit = makeCompleteJobToolkit({ resultSink });

              const runRequest = (prompt: string) =>
                session
                  .createRequest({
                    prompt,
                    system: systemText,
                    toolkit: completeJobToolkit,
                    mcpServers: options.getMcpServers?.(),
                  })
                  .pipe(
                    Effect.provide(
                      Layer.mergeAll(
                        modelLayer,
                        InlineToolExecutionService({ feed }),
                        makeToolResolverFromOperations(),
                      ),
                    ),
                  );

              yield* runRequest(promptText);

              const pollResult = yield* Deferred.poll(resultSink);

              if (Option.isNone(pollResult)) {
                yield* runRequest(
                  'You must signal task completion by calling [completeJob] with the output or failure reason.',
                );
                const retryResult = yield* Deferred.poll(resultSink);
                if (Option.isNone(retryResult)) {
                  ctx.submitOutput({ _tag: 'failure', message: 'Agent did not signal task completion.' });
                  ctx.succeed();
                  return;
                }
                yield* emitResultEffect(ctx, retryResult.value);
                return;
              }

              yield* emitResultEffect(ctx, pollResult.value);
            },
            Effect.orDie,
            Effect.scoped,
            Effect.provide(Trace.writerLayerNoop),
          ),
        };
      }),
  );

const emitResultEffect = (
  ctx: Process.ProcessContext<string, RoutineRunOutput>,
  resultEffect: Effect.Effect<unknown, RoutineError, never>,
): Effect.Effect<void> =>
  resultEffect.pipe(
    Effect.matchEffect({
      onFailure: (err) =>
        Effect.sync(() => {
          ctx.submitOutput({ _tag: 'failure', message: err.message, description: undefined });
          ctx.succeed();
        }),
      onSuccess: (value) =>
        Effect.sync(() => {
          ctx.submitOutput({ _tag: 'success', value });
          ctx.succeed();
        }),
    }),
  );

const makeCompleteJobToolkit = (options: { resultSink: Deferred.Deferred<unknown, RoutineError> }) => {
  class CompleteJobToolkit extends Toolkit.make(
    Tool.make('completeJob', {
      parameters: {
        success: Schema.optional(Schema.Any),
        failure: Schema.optional(
          Schema.Struct({
            message: Schema.String.annotations({ description: 'Short message describing the error.' }),
            description: Schema.optional(Schema.String).annotations({
              description: 'Optional longer message describing in detail what went wrong',
            }),
          }),
        ),
      },
    }),
  ) {}

  const layer = CompleteJobToolkit.toLayer({
    completeJob: Effect.fnUntraced(function* (result) {
      if (result.failure) {
        yield* Deferred.fail(
          options.resultSink,
          new RoutineError(result.failure.message, { description: result.failure.description }),
        );
      } else {
        yield* Deferred.succeed(options.resultSink, result.success);
      }
    }),
  });

  return OpaqueToolkit.make(CompleteJobToolkit, layer);
};

interface InlineToolExecutionOptions {
  feed: Feed.Feed;
}

const InlineToolExecutionService = ({ feed }: InlineToolExecutionOptions) =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const operationInvoker = yield* Operation.Service;
      return makeToolExecutionService({
        invoke: (tool, input) =>
          Effect.gen(function* () {
            const operationDef = getOperationFromTool(tool).pipe(Option.getOrThrow);
            log('invoking operation', { operationDef, input });
            const result = yield* operationInvoker
              .invoke(operationDef, input, {
                conversation: Obj.getDXN(feed).toString(),
              })
              .pipe(Effect.orDie);
            log('result', { result });
            return result;
          }),
      });
    }),
  );
