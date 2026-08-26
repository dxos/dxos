//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ToolExecutionService, ToolResolverService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { registryLayerNoop } from '@dxos/echo/testing';
import { type Segment, segmentText, sourceHash } from '@dxos/nlp';

import { Analysis, Language, LingoOperation } from '#types';

import { addWord, normalizeTerm } from '../util';

const handler: Operation.WithHandler<typeof LingoOperation.AnalyzeText> = LingoOperation.AnalyzeText.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ subject: subjectRef, text, language: languageRef, translation, vocabulary, refresh }) {
        const subject = yield* Database.load(subjectRef);
        const language = yield* Database.load(languageRef);

        const hash = sourceHash(text);
        const targetHash = translation === undefined ? undefined : sourceHash(translation);

        // One analysis per subject AND language: an object can be translated into several
        // languages, and keying on the subject alone would have each one overwrite the last.
        // Matched by filtering on the refs — a same-space ref stores an unqualified URI, so
        // comparing `ref.uri` against `Obj.getURI` never matches and every run created a duplicate.
        const [existing] = yield* Database.query(
          Filter.type(Analysis.Analysis, { subject: subjectRef, language: languageRef }),
        ).run;

        // Harvesting reads the analysis rather than calling the model again: the vocab regions were
        // chosen with the whole passage in view and already carry gloss, lemma and reading.
        const harvest = Effect.fnUntraced(function* (segments: readonly Segment[]) {
          if (!vocabulary) {
            return 0;
          }

          const deck = yield* Database.load(vocabulary);
          let added = 0;
          // `addWord` dedups against what the deck already holds by re-querying, but a passage that
          // uses the same word twice yields two vocab segments in ONE pass, and the second query need
          // not yet see the first add. Tracking the batch's own keys is what makes the pass idempotent
          // in itself, which no database-level uniqueness would be needed for.
          const seen = new Set<string>();
          for (const segment of segments) {
            if (segment.kind !== 'vocab' || !segment.gloss) {
              continue;
            }

            const source = text.slice(segment.source.start, segment.source.end);
            const key = normalizeTerm(segment.lemma ?? source);
            if (seen.has(key)) {
              continue;
            }
            seen.add(key);

            const { existing: had } = yield* addWord(deck, {
              term: source,
              translation: segment.gloss,
              lemma: segment.lemma,
              reading: segment.reading,
            });
            added += had ? 0 : 1;
          }

          return added;
        });

        if (!refresh && existing && existing.sourceHash === hash && existing.targetHash === targetHash) {
          return { analysis: Ref.make(existing), cached: true, added: yield* harvest(existing.segments) };
        }

        const segmentation = yield* segmentText(text, {
          target: translation,
          // Both options want a display NAME, not a tag: `segmentText` puts them in the prompt, and
          // "the source is in ja" reads as an instruction about a token. `code` is the source
          // (inferred, and unnamed — hence the lookup); `name` already names the target.
          sourceLanguage: language.code ? Language.getDisplayName(language.code) : undefined,
          targetLanguage: language.name,
          readingSystem: Language.getReadingSystem(language.code),
        });

        if (existing) {
          Obj.update(existing, (existing) => {
            existing.sourceHash = segmentation.sourceHash;
            existing.targetHash = segmentation.targetHash;
            existing.translation = translation;
            existing.segments = [...segmentation.segments];
            existing.language = Ref.make(language);
          });

          return { analysis: Ref.make(existing), cached: false, added: yield* harvest(segmentation.segments) };
        }

        const analysis = yield* Database.add(
          Analysis.make({
            subject: Ref.make(subject),
            language: Ref.make(language),
            sourceHash: segmentation.sourceHash,
            targetHash: segmentation.targetHash,
            translation,
            segments: [...segmentation.segments],
          }),
        );

        return { analysis: Ref.make(analysis), cached: false, added: yield* harvest(segmentation.segments) };
      },
      Effect.provide(
        Layer.mergeAll(
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
