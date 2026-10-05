//
// Copyright 2026 DXOS.org
//

import { MermaidEngine, Objective, type Scene } from '@dxos/diagram';

/** Scene units of the engine's grid, the unit its cost terms measure in. */
const GRID = 32;

/**
 * Prefers layouts no wider than the panel: the engine's default objective favours a few fewer
 * crossings over any width, and a wide layout in the narrow canvas either scrolls or shrinks to
 * unreadable text. Weighted so ~6 grid units of overflow cost as much as one crossing.
 */
const fitsWidth = (width: number): Objective.CostTerm => ({
  id: 'fits-panel',
  description: `Width beyond ${width} scene units.`,
  weight: 0.5,
  measure: ({ report }) => Math.max(0, report.metrics.width - width) / GRID,
});

export type LayoutOptions = Pick<MermaidEngine.CompileOptions, 'emitCandidate'> & {
  /** The panel's width in scene units; omitted, the engine's own objective chooses. */
  readonly width?: number;
};

/**
 * Lays a diagram out with plugin-illustrator's ELK engine (`@dxos/diagram`) and returns the world
 * objects `SceneSvg` draws. `source` is `Diagram.toSource` of a stored graph; `emitCandidate` routes
 * the engine's layout candidates elsewhere — nearly all of its time — so they can run in parallel.
 */
export const layout = async (
  source: string,
  { emitCandidate, width }: LayoutOptions = {},
): Promise<Scene.WorldObject[]> => {
  const objective =
    width === undefined
      ? Objective.DEFAULT
      : { ...Objective.DEFAULT, costs: [...Objective.DEFAULT.costs, fitsWidth(width)] };
  const commands = await MermaidEngine.compile(source, { emitCandidate, objective });
  return commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
};
