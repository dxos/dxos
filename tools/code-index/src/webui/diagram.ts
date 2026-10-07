//
// Copyright 2026 DXOS.org
//

import { Dsl, type Scene, SemanticEngine } from '@dxos/diagram';
import * as EffectEx from '@dxos/effect/EffectEx';

/** Boxes past which the full search takes long enough to be worth drawing a quick layout first. */
export const QUICK_FIRST = 16;

export type Quality = 'quick' | 'full';

const objectsOf = (commands: readonly Scene.Command[]): Scene.WorldObject[] =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/** Boxes in a source; the DSL check has already accepted it, so the reading has a diagram. */
export const sizeOf = (source: string): number => Dsl.read(source).diagram?.nodes.length ?? 0;

/**
 * Lays a diagram's DSL source out with plugin-illustrator's semantic engine (`@dxos/diagram`) and
 * returns the world objects `SceneSvg` draws. `full` is the engine's whole search, which also tries
 * ELK's placements: about two minutes for 40 boxes. `quick` is one grid-search restart without
 * them, a few seconds, drawn while the full search runs.
 */
export const layout = async (source: string, quality: Quality = 'full'): Promise<Scene.WorldObject[]> => {
  if (quality === 'full') {
    return objectsOf((await EffectEx.runPromise(Dsl.compile(source))).commands);
  }
  const reading = Dsl.read(source);
  return objectsOf(
    Dsl.withLayout(reading, reading.diagram && SemanticEngine.solve(reading.diagram, { restarts: 1 })).commands,
  );
};
