//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Diagnostics, Objective, Score } from '@dxos/diagram';
import { type Scene, findLayout } from '@dxos/scene';

import { type NodeRegistry } from '../model/index.ts';
import { type DiagramObjects, toDiagramObjects } from '../utils/index.ts';
import { toRenderList2D } from '../viewport2d/index.ts';

/**
 * A 2D layout as `@dxos/diagram` objects, read through the 2D viewport's model (each element as the canvas draws it,
 * links routed), so `Diagnostics` and an `Objective` grade the layout a person is editing; undefined when the document
 * has no such 2D layout.
 */
export const layoutDiagramObjects = (
  document: Scene.SceneDocument,
  layout: string,
  registry: NodeRegistry,
): DiagramObjects | undefined => {
  const record = findLayout(document, layout);
  return record?.dim === '2d' ? toDiagramObjects(toRenderList2D(document, record), registry) : undefined;
};

/** Scored mode over a 2D layout: the objective's scorers (the default one unless given), none for no such layout. */
export const scoreLayout2D = (
  document: Scene.SceneDocument,
  layout: string,
  registry: NodeRegistry,
  objective: Objective.Objective = Objective.DEFAULT,
): Effect.Effect<Score.Scored[]> => {
  const diagram = layoutDiagramObjects(document, layout, registry);
  return diagram
    ? Score.evaluate(Score.fromObjective(objective), {
        objects: diagram.objects,
        report: Diagnostics.analyze(diagram.objects),
      })
    : Effect.succeed([]);
};
