//
// Copyright 2026 DXOS.org
//

import { Dsl, type Scene } from '@dxos/diagram';
import { EffectEx } from '@dxos/effect';

/**
 * Lays a diagram's DSL source out with plugin-illustrator's semantic engine (`@dxos/diagram`) and
 * returns the world objects `SceneSvg` draws. The source is one `Diagram.check` accepted, so its
 * problems are only the warnings for hints the engine relaxed, which still draw.
 */
export const layout = async (source: string): Promise<Scene.WorldObject[]> => {
  const { commands } = await EffectEx.runPromise(Dsl.compile(source));
  return commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
};
