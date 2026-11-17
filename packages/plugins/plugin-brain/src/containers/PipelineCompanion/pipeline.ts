//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Dsl } from '@dxos/diagram';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type FactStoreApi, RDF } from '@dxos/pipeline-rdf';
import { type Scene } from '@dxos/scene';

import { pipelineScene } from './pipeline-diagram.ts';

/** Every run state the store records, newest first; none when the store cannot be read. */
export const readPipelines = (store: FactStoreApi): Promise<RDF.Pipeline.State[]> =>
  EffectEx.runPromise(
    store.rows(RDF.Pipeline.SPARQL).pipe(
      Effect.map((rows) =>
        RDF.Pipeline.fromValues(rows.flatMap(({ state }) => (state ? [state.value] : []))).sort((left, right) =>
          (right.startedAt ?? '').localeCompare(left.startedAt ?? ''),
        ),
      ),
      Effect.orElseSucceed((): RDF.Pipeline.State[] => []),
    ),
  );

/** The run's diagram as the scene document `Scene2DView` draws. */
export const pipelineDocument = (state: RDF.Pipeline.State): Scene.SceneDocument =>
  Dsl.readScenes(pipelineScene(state)).document;
