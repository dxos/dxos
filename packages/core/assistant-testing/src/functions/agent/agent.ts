import { AiService, ConsolePrinter, ModelName } from '@dxos/ai';
import { AiSession, GenerationObserver } from '@dxos/assistant';
import { Prompt } from '@dxos/blueprints';
import { Type } from '@dxos/echo';
import { DatabaseService, TracingService, defineFunction } from '@dxos/functions';
import { Effect, Schema } from 'effect';

export default defineFunction({
  name: 'dxos.org/function/agent',
  description: 'Agentic worker that executes a provided prompt using blueprints and tools.',
  inputSchema: Schema.Struct({
    prompt: Type.Ref(Prompt.Prompt),
    input: Schema.Any,

    /**
     * @default @anthropic/claude-opus-4-0
     */
    model: Schema.optional(ModelName),
  }),
  outputSchema: Schema.Any,
  handler: Effect.fnUntraced(function* ({ data: { prompt, input, model = '@anthropic/claude-opus-4-0' } }) {
    yield* DatabaseService.flush({ indexes: true });
    const promptObj = yield* DatabaseService.load(prompt);
    yield* TracingService.emitStatus({ message: `Running ${promptObj.name}` });

    const session = new AiSession();
    const result = yield* session
      .run({
        prompt: JSON.stringify(input ?? {}),
        system: promptObj.instructions,
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
