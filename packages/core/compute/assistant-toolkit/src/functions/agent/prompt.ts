//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, OpaqueToolkit, ModelName } from '@dxos/ai';
import {
  AiSession,
  getOperationFromTool,
  makeToolExecutionService,
  makeToolResolverFromOperations,
} from '@dxos/assistant';
import { Template, Trace, Operation } from '@dxos/compute';
import { Database, Feed, JsonSchema, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { PromptError } from '../../errors';
import * as Chat from '../../types/Chat';
import { RunInstructions } from './definitions';

const DEFAULT_MODEL: ModelName = 'ai.claude.model.claude-opus-4-8';

const routineOutputSchema = (output: JsonSchema.JsonSchema): Schema.Schema.All => {
  // Routines default to Void output; completeJob still needs to accept arbitrary success payloads.
  if ('$id' in output && output.$id === '/schemas/unknown') {
    return Schema.Any;
  }
  return JsonSchema.toEffectSchema(output);
};

export default RunInstructions.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* (data) {
        log.info('processing input', { input: data.input });

        const input = yield* Ref.isRef(data.input)
          ? Database.load(data.input).pipe(Effect.map(Obj.toJSON))
          : Effect.succeed(data.input);

        yield* Database.flush();
        const instructions = yield* Database.load(data.instructions);
        yield* Trace.emitStatus(`Running ${instructions.id}`);

        log.info('starting agent', { instructions: instructions.id, input });

        // Bind the instructions' own refs, dropping any that no longer resolve. The refs must be
        // bound as-is (not re-wrapped via `Ref.make`) to preserve their registry DXN: bindings
        // are persisted to the conversation feed, and registry-only blueprints have no space-DB
        // identity, so an EID ref would not resolve when the binding is re-read.
        const blueprintRefs = yield* Effect.filter(instructions.blueprints, (ref) =>
          Database.load(ref).pipe(
            Effect.as(true),
            Effect.catchTag('EntityNotFoundError', () => Effect.succeed(false)),
          ),
        );

        // Bind the instructions' context objects (sibling of blueprints), dropping any that no longer resolve.
        const objectRefs = yield* Effect.filter(instructions.objects ?? [], (ref) =>
          Database.load(ref).pipe(
            Effect.as(true),
            Effect.catchTag('EntityNotFoundError', () => Effect.succeed(false)),
          ),
        );

        const textDoc = yield* Database.load(instructions.text);
        let promptText = Template.process(textDoc.content, input);

        if (input !== undefined) {
          promptText += `\n<input>${JSON.stringify(input)}</input>`;
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
        if (data.systemInstructions) {
          systemText += `\n${data.systemInstructions}`;
        }

        const modelLayer = AiService.model(data.model ?? DEFAULT_MODEL);

        let feed: Feed.Feed;
        if (data.chat) {
          const chat = yield* Database.load(data.chat);
          invariant(Obj.instanceOf(Chat.Chat, chat), 'Expected Chat object.');
          feed = yield* Database.load(chat.feed);
        } else {
          feed = yield* Database.add(Feed.make());
        }

        const resultSink = yield* Deferred.make<unknown, PromptError>();
        const promptToolkit = makePromptAgentToolkit({
          output: routineOutputSchema(instructions.output),
          resultSink,
        });

        const runtime = yield* Effect.runtime<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));

        yield* Effect.promise(() =>
          session.context.bind({
            blueprints: blueprintRefs,
            objects: objectRefs,
          }),
        );

        yield* session
          .createRequest({
            prompt: promptText,
            system: systemText,
            toolkit: promptToolkit,
          })
          .pipe(
            Effect.provide(
              Layer.mergeAll(modelLayer, ToolExecutionService({ feed }), makeToolResolverFromOperations()),
            ),
          );

        return yield* Deferred.poll(resultSink).pipe(
          Effect.flatten,
          Effect.flatten,
          Effect.catchTag('NoSuchElementException', () =>
            Effect.gen(function* () {
              yield* session
                .createRequest({
                  prompt: 'You must signal task completion by calling [completeJob] with the output or failure reason.',
                  system: systemText,
                  toolkit: promptToolkit,
                })
                .pipe(
                  Effect.provide(
                    Layer.mergeAll(modelLayer, ToolExecutionService({ feed }), makeToolResolverFromOperations()),
                  ),
                );

              return yield* Deferred.poll(resultSink).pipe(
                Effect.flatten,
                Effect.flatten,
                Effect.catchTag('NoSuchElementException', () =>
                  Effect.fail(new PromptError('Agent did not signal task completion.', {})),
                ),
              );
            }),
          ),
        );
      },
      Effect.tapBoth({
        onSuccess: () => Database.flush(),
        onFailure: () => Database.flush(),
      }),
      Effect.scoped,
    ),
  ),
  Operation.opaqueHandler,
);

const makePromptAgentToolkit = (options: {
  output: Schema.Schema.All;
  resultSink: Deferred.Deferred<unknown, PromptError>;
}) => {
  class PromptAgentToolkit extends Toolkit.make(
    Tool.make('completeJob', {
      parameters: {
        success: Schema.optional(options.output),
        failure: Schema.optional(
          Schema.Struct({
            message: Schema.String.annotations({
              description: 'Short message describing the error.',
            }),
            description: Schema.optional(Schema.String).annotations({
              description: 'Optional longer message describing in detail what went wrong',
            }),
          }),
        ),
      },
    }),
  ) {}
  const layer = PromptAgentToolkit.toLayer({
    completeJob: Effect.fnUntraced(function* (result) {
      if (result.failure) {
        yield* Deferred.fail(
          options.resultSink,
          new PromptError(result.failure.message, {
            description: result.failure.description,
          }),
        );
      } else {
        yield* Deferred.succeed(options.resultSink, result.success);
      }
    }),
  });

  return OpaqueToolkit.make(PromptAgentToolkit, layer);
};

interface ToolExecutionServiceOptions {
  feed: Feed.Feed;
}

const ToolExecutionService = ({ feed }: ToolExecutionServiceOptions) =>
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
                conversation: Obj.getURI(feed),
              })
              .pipe(Effect.orDie);
            log('result', { result });
            return result;
          }),
      });
    }),
  );
