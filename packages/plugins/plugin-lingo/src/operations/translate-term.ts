//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiRequest } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database } from '@dxos/echo';
import { registryLayerNoop } from '@dxos/echo/testing';
import { trim } from '@dxos/util';

import { Language, LingoOperation } from '#types';

import { lastText, parseJsonArray } from '../util';

const handler: Operation.WithHandler<typeof LingoOperation.TranslateTerm> = LingoOperation.TranslateTerm.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ term, language: languageRef, context }) {
        const language = yield* Database.load(languageRef);

        const result = yield* new AiRequest.Request({}).run({
          prompt: trim`
            Study language: ${language.name} (${language.code})
            Translate into: ${Language.getBaseCode(language)}
            Term: ${term}
            ${context ? `Sentence: ${context}` : ''}
          `,
          system: SYSTEM_PROMPT,
          history: [],
        });

        // A single-entry array keeps one parser for both this and the bulk extraction.
        const candidates = yield* Option.match(lastText(result).pipe(Option.flatMap(parseJsonArray)), {
          onNone: () => Effect.succeed([]),
          onSome: (value) =>
            Schema.decodeUnknownEffect(Schema.Array(LingoOperation.Candidate))(value).pipe(
              Effect.orElseSucceed(() => []),
            ),
        });

        // Falls back to the term itself: a failed translation still lets the learner file the word.
        return candidates[0] ?? { term, translation: term };
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('com.anthropic.model.claude-haiku-4-5.default'),
          ToolResolverService.layerEmpty,
          ToolExecutionService.layerEmpty,
          Trace.writerLayerNoop,
          registryLayerNoop,
        ),
      ),
    ),
  ),
);

export default handler;

const SYSTEM_PROMPT = trim`
  You translate a single term for a language learner, using the surrounding sentence to pick the
  sense that actually applies.

  # Output
  Respond with a JSON array holding exactly one object — no prose, no code fence — with the keys
  "term", "lemma", "translation", "reading" and "partOfSpeech". Omit keys that do not apply.
`;
