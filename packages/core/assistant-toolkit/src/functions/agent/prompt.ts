//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, ConsolePrinter, ModelName } from '@dxos/ai';
import { AiSession, GenerationObserver, createToolkit } from '@dxos/assistant';
import { Prompt, Template } from '@dxos/blueprints';
import { Obj, Ref, Type } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { TracingService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';

const DEFAULT_MODEL: ModelName = '@anthropic/claude-opus-4-0';

export default defineFunction({
  key: 'dxos.org/function/prompt',
  name: 'Agent',
  description: 'Agentic worker that executes a provided prompt using blueprints and tools.',
  inputSchema: Schema.Struct({
    prompt: Type.Ref(Prompt.Prompt),
    systemPrompt: Type.Ref(Prompt.Prompt).pipe(Schema.optional),
    /**
     * @default @anthropic/claude-opus-4-0
     */
    model: Schema.optional(ModelName),
    /**
     * Input object or data.
     * References get auto-resolved.
     */
    input: Schema.Any.pipe(Schema.annotations({ title: 'Input' })),
  }),
  outputSchema: Schema.Any,
  handler: Effect.fnUntraced(function* ({ data }) {
    log.info('processing input', { input: data.input });

    // TODO(wittjosiah): Support templated object as input.
    //   Currently the object templating only supports direct pass-through or strings.
    // const input = { ...data.input };
    // for (const key of Object.keys(data.input)) {
    //   const value = data.input[key];
    //   if (Ref.isRef(value)) {
    //     const object = yield* Database.Service.load(value);
    //     input[key] = Obj.toJSON(object);
    //   } else {
    //     input[key] = JSON.stringify(value);
    //   }
    // }
    const input = yield* Match.value(data.input).pipe(
      Match.when(
        (value: any) => Ref.isRef(value),
        Effect.fnUntraced(function* (ref) {
          const object = yield* Database.Service.load(ref);
          return Obj.toJSON(object as Obj.Any);
        }),
      ),
      Match.orElse(() => Effect.succeed(data.input)),
    );

    yield* Database.Service.flush({ indexes: true });
    const prompt = yield* Database.Service.load(data.prompt);
    const systemPrompt = data.systemPrompt ? yield* Database.Service.load(data.systemPrompt) : undefined;
    yield* TracingService.emitStatus({ message: `Running ${prompt.id}` });

    log.info('starting agent', { prompt: prompt.id, input });

    const blueprints = yield* Function.pipe(
      prompt.blueprints,
      Array.appendAll(systemPrompt?.blueprints ?? []),
      Effect.forEach(Database.Service.loadOption),
      Effect.map(Array.filter(Option.isSome)),
      Effect.map(Array.map((option) => option.value)),
    );
    const toolkit = yield* createToolkit({ blueprints });

    const objects = yield* Function.pipe(
      prompt.context,
      Array.appendAll(systemPrompt?.context ?? []),
      Effect.forEach(Database.Service.loadOption),
      Effect.map(Array.filter(Option.isSome)),
      Effect.map(Array.map((option) => option.value)),
    );

    const promptInstructions = yield* Database.Service.load(prompt.instructions.source);
    const promptText = Template.process(promptInstructions.content, input);

    const systemInstructions = systemPrompt
      ? yield* Database.Service.load(systemPrompt.instructions.source)
      : undefined;
    const systemText = systemInstructions ? Template.process(systemInstructions.content, {}) : undefined;

    const session = new AiSession();
    const result = yield* session
      .run({
        prompt: promptText,
        system: systemText,
        blueprints,
        objects: objects as Obj.Any[],
        toolkit,
        observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'agent' })),
      })
      .pipe(Effect.provide(AiService.model(data.model ?? DEFAULT_MODEL)));
    const lastBlock = result
      .at(-1)
      ?.blocks.filter((block) => block._tag === 'text')
      .at(-1);

    return {
      note: lastBlock?.text,
    };
  }),
});
