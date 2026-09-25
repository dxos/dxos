//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Prompt from 'effect/unstable/ai/Prompt';

import { type AiService } from '@dxos/ai';

/**
 * `?model=scripted` swaps every language model the assistant resolves for {@link makeScriptedModel}, so
 * the perf flow can drive a whole agent loop — streaming, tool dispatch, database reads, rendering —
 * without a provider, a key, or a model's variable latency in the measurement.
 */
export const PARAM_MODEL = 'model';

/** Model calls per user prompt that query the database before the closing answer. */
export const SCRIPTED_QUERY_TURNS = 20;

/**
 * Loaded on the first model resolution rather than at boot: the scripted model and the operation
 * definitions it names stay out of the main chunk, which `check-boot-budget` measures.
 */
export const scriptedAiServiceMiddleware = (upstream: AiService.Service): AiService.Service => ({
  ...upstream,
  languageModel: () =>
    Layer.unwrap(
      Effect.promise(() => import('./scripted-model.ts')).pipe(
        Effect.flatMap(({ makeScriptedModel }) => makeScriptedModel()),
      ),
    ),
});

/**
 * Tool calls to `toolName` since the user's latest prompt.
 *
 * A user message right after a tool result is a mid-loop injection (a reminder), not a new prompt,
 * so it does not reset the count — otherwise one injection would restart the 20 turns forever.
 */
export const countTurnsSincePrompt = (prompt: Prompt.Prompt, toolName: string): number => {
  let count = 0;
  for (let index = prompt.content.length - 1; index >= 0; index--) {
    const message = prompt.content[index];
    if (message.role === 'user' && prompt.content[index - 1]?.role !== 'tool') {
      break;
    }
    if (message.role === 'assistant') {
      count += message.content.filter((part) => part.type === 'tool-call' && part.name === toolName).length;
    }
  }
  return count;
};
