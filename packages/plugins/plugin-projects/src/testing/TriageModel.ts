//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import type * as Prompt from 'effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiService } from '@dxos/ai';

import { type ProjectMailboxOperation } from '#types';

/** Canned triage answers, matched by a substring of the message text the prompt quotes. */
export type Script = readonly { readonly match: string; readonly result: ProjectMailboxOperation.TriageResult }[];

const NOTHING: ProjectMailboxOperation.TriageResult = { tasks: [] };

const promptText = (prompt: Prompt.Prompt): string => {
  let text = '';
  for (const message of prompt.content) {
    if (message.role === 'system') {
      continue;
    }
    for (const part of message.content) {
      if (part.type === 'text') {
        text += part.text;
      }
    }
  }
  return text;
};

/**
 * An `AiService` whose model answers `TriageMessages` from a script instead of a provider, so a test or
 * story triages a channel deterministically and offline. A message no entry matches is chatter.
 */
export const layer = (script: Script, { delayMs = 0 }: { delayMs?: number } = {}): Layer.Layer<AiService.AiService> =>
  Layer.succeed(
    AiService.AiService,
    AiService.make({
      // `generateObject` is derived from the text `generateText` returns, hence the JSON body.
      languageModel: () =>
        Layer.effect(
          LanguageModel.LanguageModel,
          LanguageModel.make({
            generateText: ({ prompt }) => {
              const text = promptText(prompt);
              const result = script.find((entry) => text.includes(entry.match))?.result ?? NOTHING;
              return Effect.sleep(delayMs).pipe(Effect.as([{ type: 'text', text: JSON.stringify(result) }]));
            },
            streamText: () => Stream.empty,
          }),
        ),
    }),
  );
