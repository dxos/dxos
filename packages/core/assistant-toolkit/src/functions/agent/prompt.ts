//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { AiService, ConsolePrinter, ModelName } from '@dxos/ai';
import { AiSession, GenerationObserver, createToolkit } from '@dxos/assistant';
import { Template } from '@dxos/blueprints';
import { Database, Obj, Ref } from '@dxos/echo';
import { TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { AgentPrompt } from './definitions';

const DEFAULT_MODEL: ModelName = '@anthropic/claude-opus-4-0';

export default AgentPrompt.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      log.info('processing input', { input: data.input });

      const input = yield* Ref.isRef(data.input)
        ? Database.load(data.input).pipe(Effect.map(Obj.toJSON))
        : Effect.succeed(data.input);

      yield* Database.flush();
      const prompt = yield* Database.load(data.prompt);
      const systemPrompt = data.systemPrompt ? yield* Database.load(data.systemPrompt) : undefined;
      yield* TracingService.emitStatus({ message: `Running ${prompt.id}` });

      log.info('starting agent', { prompt: prompt.id, input });

      const blueprints = yield* Function.pipe(
        prompt.blueprints,
        Array.appendAll(systemPrompt?.blueprints ?? []),
        Effect.forEach(Database.loadOption),
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      );
      const toolkit = yield* createToolkit({ blueprints });

      const objects = yield* Function.pipe(
        prompt.context,
        Array.appendAll(systemPrompt?.context ?? []),
        Effect.forEach(Database.loadOption),
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      );

      const promptInstructions = yield* Database.load(prompt.instructions.source);
      const promptText = Template.process(promptInstructions.content, input);

      const systemInstructions = systemPrompt ? yield* Database.load(systemPrompt.instructions.source) : undefined;
      const systemText = systemInstructions ? Template.process(systemInstructions.content, {}) : undefined;

      const session = new AiSession();
      const result = yield* session
        .run({
          prompt: promptText,
          system: systemText,
          blueprints,
          objects: objects as Obj.Unknown[],
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
  ),
);
