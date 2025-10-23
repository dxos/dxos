//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, ConsolePrinter, ModelName } from '@dxos/ai';
import { AiSession, GenerationObserver, createToolkit } from '@dxos/assistant';
import { Prompt, Template } from '@dxos/blueprints';
import { Obj, Ref, Type } from '@dxos/echo';
import { DatabaseService, TracingService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';

const DEFAULT_MODEL = '@anthropic/claude-opus-4-0';

export default defineFunction({
  key: 'dxos.org/function/agent',
  name: 'Agent',
  description: 'Agentic worker that executes a provided prompt using blueprints and tools.',
  inputSchema: Schema.Struct({
    prompt: Type.Ref(Prompt.Prompt),

    system: Type.Ref(Prompt.Prompt).pipe(Schema.optional),

    /**
     * Input object or data.
     * References get auto-resolved.
     */
    input: Schema.Record({ key: Schema.String, value: Schema.Any }),

    /**
     * @default @anthropic/claude-opus-4-0
     */
    model: Schema.optional(ModelName),
  }),
  outputSchema: Schema.Any,
  handler: Effect.fnUntraced(function* ({ data }) {
    log.info('processing input', { input: data.input });

    const input = { ...data.input };
    for (const key of Object.keys(data.input)) {
      const value = data.input[key];
      if (Ref.isRef(value)) {
        const object = yield* DatabaseService.load(value);
        input[key] = Obj.toJSON(object);
      }
    }

    yield* DatabaseService.flush({ indexes: true });
    const prompt = yield* DatabaseService.load(data.prompt);
    const system = data.system ? yield* DatabaseService.load(data.system) : undefined;
    yield* TracingService.emitStatus({ message: `Running ${prompt.name}` });

    log.info('starting agent', { prompt: prompt.name, input: data.input });

    const blueprints = yield* Function.pipe(
      prompt.blueprints,
      Array.appendAll(system?.blueprints ?? []),
      Effect.forEach(DatabaseService.loadOption),
      Effect.map(Array.filter(Option.isSome)),
      Effect.map(Array.map((option) => option.value)),
    );
    const objects = yield* Function.pipe(
      prompt.context,
      Array.appendAll(system?.context ?? []),
      Effect.forEach(DatabaseService.loadOption),
      Effect.map(Array.filter(Option.isSome)),
      Effect.map(Array.map((option) => option.value)),
    );
    const toolkit = yield* createToolkit({ blueprints });

    const promptText = Template.process(prompt.instructions, input);

    const session = new AiSession();
    const result = yield* session
      .run({
        prompt: promptText,
        system: system?.instructions,
        blueprints,
        objects: objects as Obj.Any[],
        toolkit,
        observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'agent' })),
      })
      .pipe(Effect.provide(AiService.model(data.model ?? DEFAULT_MODEL)));
    const lastBlock = result.at(-1)?.blocks.at(-1);
    const note = lastBlock?._tag === 'text' ? lastBlock.text : undefined;

    return {
      note,
    };
  }),
});
