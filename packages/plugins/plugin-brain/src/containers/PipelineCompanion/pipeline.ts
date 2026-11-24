//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { DSL } from '@dxos/diagram';
import { Pipeline } from '@dxos/echo-memory';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type FactStoreApi } from '@dxos/pipeline-rdf';
import { type Scene } from '@dxos/scene';

import { pipelineScene } from './pipeline-diagram.ts';

/** Every run state the store records, newest first; none when the store cannot be read. */
export const readPipelines = (store: FactStoreApi): Promise<Pipeline.State[]> =>
  EffectEx.runPromise(
    store.rows(Pipeline.SPARQL).pipe(
      Effect.map((rows) =>
        Pipeline.fromValues(rows.flatMap(({ state }) => (state ? [state.value] : []))).sort((left, right) =>
          (right.startedAt ?? '').localeCompare(left.startedAt ?? ''),
        ),
      ),
      Effect.orElseSucceed((): Pipeline.State[] => []),
    ),
  );

/** The run's diagram as the scene document `Scene2DView` draws. */
export const pipelineDocument = (state: Pipeline.State): Scene.SceneDocument =>
  DSL.readScenes(pipelineScene(state)).document;
