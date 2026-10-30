//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import { Diagnostics, Objective, Score } from '@dxos/diagram';
import { type RenderList2D, defaultNodeRegistry, toDiagramObjects } from '@dxos/react-ui-canvas';
import { fromRenderList2D } from '@dxos/react-ui-canvas/headless';
import { createModelViewTree, createNestedViewTree, createSquareTree } from '@dxos/react-ui-canvas/testing';
import { type Scene } from '@dxos/scene';

import { scoreLayout2D } from './score.ts';

/** A canvas sample's Views as the scene document the editor holds. */
const documentOf = (views: readonly RenderList2D[], root: string): Scene.SceneDocument => {
  const read = views.map(fromRenderList2D);
  const objects = Object.fromEntries(read.flatMap(({ objects }) => objects.map((object) => [object.id, object])));
  return {
    scenes: [{ id: 'scene', dim: '2d', layout: root, camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
    layouts: read.map(({ layout }) => ({ ...layout, model: 'model' })),
    models: [{ id: 'model', dim: '2d', objects }],
  };
};

/** The scores the Scored story shows for a View: the default objective's scorers over its diagram objects. */
const scoreView = (view: RenderList2D) => {
  const { objects } = toDiagramObjects(view, defaultNodeRegistry);
  return Score.evaluate(Score.fromObjective(Objective.DEFAULT), { objects, report: Diagnostics.analyze(objects) });
};

describe('scoreLayout2D', () => {
  test('the score over a Layout2D equals the score over the corpus', () => {
    for (const tree of [createSquareTree(), createNestedViewTree(), createModelViewTree()]) {
      const view = tree.views.find(({ id }) => id === tree.root);
      if (!view) {
        throw new Error('A canvas sample has its root View.');
      }
      const document = documentOf(tree.views, tree.root);
      const layout = Effect.runSync(scoreLayout2D(document, tree.root, defaultNodeRegistry));
      expect(layout).toEqual(Effect.runSync(scoreView(view)));
      expect(layout.length).toBeGreaterThan(0);
    }
  });

  test('a layout the document does not hold has no score', () => {
    const document = documentOf(createSquareTree().views, createSquareTree().root);
    expect(Effect.runSync(scoreLayout2D(document, 'missing', defaultNodeRegistry))).toEqual([]);
  });
});
