//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Diagnostics, Objective, type Scene, Score } from '@dxos/diagram';

export type SceneScore = {
  overall?: number;
  scores: readonly Score.Scored[];
  diagnostics: readonly Diagnostics.Diagnostic[];
};

/** The layout objective's scores for a scene; synchronous, since no term asks anything outside the process. */
export const scoreScene = (objects: readonly Scene.WorldObject[]): SceneScore => {
  const report = Diagnostics.analyze(objects);
  const scores = Effect.runSync(Score.evaluate(Score.fromObjective(Objective.DEFAULT), { objects, report }));
  return { overall: Score.overall(scores), scores, diagnostics: report.diagnostics };
};
