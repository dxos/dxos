//
// Copyright 2025 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import {
  AiSession,
  getOperationFromTool,
  makeToolExecutionService,
  makeToolResolverFromOperations,
} from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Template from '@dxos/compute/Template';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { PromptError } from '../errors.ts';
import * as Chat from '../types/Chat.ts';
import { makeCompleteJobParameters, makeCompleteJobTool } from './complete-job-tool.ts';
import { RunInstructions } from './definitions.ts';

const DEFAULT_MODEL: DXN.DXN = DXN.make('com.anthropic.model.claude-opus-5.default');

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
        // are persisted to the conversation feed, and registry-only skills have no space-DB
        // identity, so an EID ref would not resolve when the binding is re-read.
        const skillRefs = yield* Effect.filter(instructions.skills, (ref) =>
          Database.load(ref).pipe(
            Effect.as(true),
            Effect.catchTag('EntityNotFoundError', () => Effect.succeed(false)),
          ),
        );

        // Bind the instructions' context objects (sibling of skills), dropping any that no longer resolve.
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
          Complete the task before you, and at the end call [completeJob] with {"success": <output>}.
          The output goes inside "success" — never at the top level, and never wrapped in a second
          "success" of its own.
          If you are unable to complete the task, call [completeJob] with {"failure": {"message": "..."}}.
          Pass one of the two, never both, and omit the field you do not use.
          If no output is required, call [completeJob] with an empty object: {}
          The success value must be strictly valid JSON: quote free text, and write numbers without
          digit separators (3628800, never 3,628,800).
          Do not stop until you call [completeJob].
        `;
        if (data.systemInstructions) {
          systemText += `\n${data.systemInstructions}`;
        }

        const modelLayer = AiService.model(DXN.getName(data.model ?? DEFAULT_MODEL));

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
          completeJobTool: makeCompleteJobTool(instructions.output),
          parameters: makeCompleteJobParameters(instructions.output),
          resultSink,
        });

        const runtime = yield* Effect.context<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));

        yield* Effect.promise(() =>
          session.context.bind({
            skills: skillRefs,
            objects: data.chat ? [...objectRefs, data.chat] : objectRefs,
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
          Effect.flatMap(Effect.fromOption),
          Effect.flatten,
          Effect.catchTag('NoSuchElementError', () =>
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
                Effect.flatMap(Effect.fromOption),
                Effect.flatten,
                Effect.catchTag('NoSuchElementError', () =>
                  Effect.fail(new PromptError('Agent did not signal task completion.', {})),
                ),
              );
            }),
          ),
        );
      },
      // v4 dropped `tapBoth`; `onExit` runs the finalizer on either outcome.
      Effect.onExit(() => Database.flush()),
      Effect.scoped,
    ),
  ),
  Operation.opaqueHandler,
);

const makePromptAgentToolkit = (options: {
  completeJobTool: ReturnType<typeof makeCompleteJobTool>;
  parameters: ReturnType<typeof makeCompleteJobParameters>;
  resultSink: Deferred.Deferred<unknown, PromptError>;
}) => {
  class PromptAgentToolkit extends Toolkit.make(options.completeJobTool) {}
  const layer = PromptAgentToolkit.toLayer({
    completeJob: Effect.fnUntraced(function* (input) {
      // A dynamic tool's input is unvalidated; a decode failure is reported to the model as a
      // tool failure so it can correct the call.
      const result = yield* Schema.decodeUnknownEffect(options.parameters)(input).pipe(
        Effect.mapError((error) => String(error)),
      );
      // A success payload wins over a failure sent alongside it, so a placeholder cannot discard
      // completed work.
      if (result.success == null && result.failure) {
        yield* Deferred.fail(
          options.resultSink,
          new PromptError(result.failure.message, {
            description: result.failure.description ?? undefined,
          }),
        );
      } else {
        yield* Deferred.succeed(options.resultSink, result.success ?? undefined);
      }
    }),
  });

  return OpaqueToolkit.make(PromptAgentToolkit, layer);
};

interface ToolExecutionServiceOptions {
  feed: Feed.Feed;
}

const ToolExecutionService = ({ feed }: ToolExecutionServiceOptions) =>
  Layer.unwrap(
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
