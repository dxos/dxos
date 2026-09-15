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
import { Database, Ref } from '@dxos/echo';
import { registryLayerNoop } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { Language, LingoOperation } from '#types';

import { addWord, lastText, normalizeTerm, parseJsonArray } from '../util/index.ts';

const DEFAULT_LIMIT = 25;

/** The model returns a bare array; each entry is validated before anything is written to the deck. */
const Candidates = Schema.Array(LingoOperation.Candidate);

const handler: Operation.WithHandler<typeof LingoOperation.ExtractVocabulary> = LingoOperation.ExtractVocabulary.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ source, vocabulary, limit = DEFAULT_LIMIT }) {
        const text = yield* Database.load(source);
        const deck = yield* Database.load(vocabulary);
        const language = yield* Database.load(deck.language);
        const content = text.content?.trim() ?? '';
        invariant(content.length > 0, 'Source text is empty.');

        const result = yield* new AiRequest.Request({}).run({
          prompt: renderPrompt({ language, content, limit }),
          system: SYSTEM_PROMPT,
          history: [],
        });

        const candidates = yield* Option.match(lastText(result).pipe(Option.flatMap(parseJsonArray)), {
          onNone: () => Effect.die(new Error('The assistant returned no vocabulary.')),
          onSome: (value) =>
            Schema.decodeUnknownEffect(Candidates)(value).pipe(
              Effect.tapError((error) => Effect.sync(() => log.warn('malformed extraction reply', { error }))),
              Effect.orDie,
            ),
        });

        // Dedup within the reply as well as against the deck: models repeat a term across
        // inflections, and each write would otherwise re-read the deck and still admit both.
        const seen = new Set<string>();
        const words = [];
        let skipped = 0;
        for (const candidate of candidates.slice(0, limit)) {
          const key = normalizeTerm(candidate.lemma ?? candidate.term);
          if (seen.has(key)) {
            skipped++;
            continue;
          }
          seen.add(key);

          const { word, existing } = yield* addWord(deck, {
            term: candidate.term,
            translation: candidate.translation,
            lemma: candidate.lemma,
            reading: candidate.reading,
            partOfSpeech: candidate.partOfSpeech,
            examples: candidate.example ? [candidate.example] : undefined,
          });
          if (existing) {
            skipped++;
          } else {
            words.push(Ref.make(word));
          }
        }

        yield* Database.flush();
        return { words, skipped };
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('com.anthropic.model.claude-sonnet-5.default'),
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

const renderPrompt = ({
  language,
  content,
  limit,
}: {
  language: Language.Language;
  content: string;
  limit: number;
}): string => trim`
  Study language: ${language.name} (${language.code})
  Translate into: ${Language.getBaseCode(language)}
  Learner level: ${language.level ?? 'unknown'}
  Return at most ${limit} entries.

  # Text
  ${content}
`;

const SYSTEM_PROMPT = trim`
  You extract vocabulary for a language learner from a passage of text.

  # Goal
  Pick the words and short phrases in the study language that a learner at the stated level would
  most benefit from adding to a vocabulary deck. Skip proper nouns, numbers, and words that are
  identical in the learner's own language.

  # Output
  Respond with a JSON array only — no prose, no code fence. Each entry is an object with:
  - "term": the word as it appears in the text
  - "lemma": its dictionary form (omit when identical to "term")
  - "translation": the translation into the learner's language
  - "reading": pronunciation or romanization, when the script needs it
  - "partOfSpeech": one of noun, verb, adjective, adverb, pronoun, preposition, conjunction, interjection, phrase
  - "example": the sentence from the text containing the term
`;
