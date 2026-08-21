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
import { segmentText, sourceHash } from '@dxos/nlp';

import { Analysis, Language, LingoOperation } from '#types';

const handler: Operation.WithHandler<typeof LingoOperation.AnalyzeText> = LingoOperation.AnalyzeText.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ subject: subjectRef, text, language: languageRef, translation, refresh }) {
        const subject = yield* Database.load(subjectRef);
        const language = yield* Database.load(languageRef);

        const hash = sourceHash(text);
        const targetHash = translation === undefined ? undefined : sourceHash(translation);

        // One analysis per subject; a matching hash pair means the cached ranges still describe the
        // current text, so reopening a document costs a query rather than a model call.
        const subjectUri = Obj.getURI(subject);
        const analyses = yield* Database.query(Filter.type(Analysis.Analysis)).run;
        const existing = analyses.find((candidate) => candidate.subject.uri === subjectUri);

        if (!refresh && existing && existing.sourceHash === hash && existing.targetHash === targetHash) {
          return { analysis: Ref.make(existing), cached: true };
        }

        const segmentation = yield* segmentText(text, {
          target: translation,
          sourceLanguage: language.name,
          targetLanguage: Language.getBaseCode(language),
        });

        if (existing) {
          Obj.update(existing, (existing) => {
            existing.sourceHash = segmentation.sourceHash;
            existing.targetHash = segmentation.targetHash;
            existing.translation = translation;
            existing.segments = [...segmentation.segments];
            existing.language = Ref.make(language);
          });

          return { analysis: Ref.make(existing), cached: false };
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

        return { analysis: Ref.make(analysis), cached: false };
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
