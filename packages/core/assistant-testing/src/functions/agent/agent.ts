//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, ConsolePrinter, ModelName } from '@dxos/ai';
import { AiSession, GenerationObserver, createToolkit } from '@dxos/assistant';
import { Prompt } from '@dxos/blueprints';
import { Ref, Type } from '@dxos/echo';
import { DatabaseService, TracingService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';

export default defineFunction({
  key: 'dxos.org/function/agent',
  name: 'Agent',
  description: 'Agentic worker that executes a provided prompt using blueprints and tools.',
  inputSchema: Schema.Struct({
    prompt: Type.Ref(Prompt.Prompt),

    /**
     * Input object or data.
     * References get auto-resolved.
     */
    input: Schema.Any,

    /**
     * @default @anthropic/claude-opus-4-0
     */
    model: Schema.optional(ModelName),
  }),
  outputSchema: Schema.Any,
  handler: Effect.fnUntraced(function* ({ data: { prompt, input, model = '@anthropic/claude-opus-4-0' } }) {
    if (Ref.isRef(input)) {
      input = yield* DatabaseService.load(input);
    }

    yield* DatabaseService.flush({ indexes: true });
    const promptObj = yield* DatabaseService.load(prompt);
    yield* TracingService.emitStatus({ message: `Running ${promptObj.name}` });

    log.info('starting agent', { prompt: promptObj.name, input });

    const blueprints = yield* Effect.forEach(promptObj.blueprints, DatabaseService.loadOption).pipe(
      Effect.map(Array.filter(Option.isSome)),
      Effect.map(Array.map((option) => option.value)),
    );
    const objects = yield* Effect.forEach(promptObj.context, DatabaseService.loadOption).pipe(
      Effect.map(Array.filter(Option.isSome)),
      Effect.map(Array.map((option) => option.value)),
    );
    const toolkit = yield* createToolkit({ blueprints });

    const session = new AiSession();
    const result = yield* session
      .run({
        prompt: JSON.stringify(input ?? {}),
        system: promptObj.instructions,
        blueprints,
        objects: objects as any,
        toolkit,
        observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'agent' })),
      })
      .pipe(Effect.provide(AiService.model(model)));
    const lastBlock = result.at(-1)?.blocks.at(-1);
    const note = lastBlock?._tag === 'text' ? lastBlock.text : undefined;

    return {
      note,
    };
  }),
});
