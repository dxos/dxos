//
// Copyright 2026 DXOS.org
//

import { MermaidEngine, type Scene } from '@dxos/diagram';

/**
 * Lays a diagram out with plugin-illustrator's ELK engine (`@dxos/diagram`) and returns the world
 * objects `SceneSvg` draws. `source` is `Diagram.toSource` of a stored graph; `emitCandidate` routes
 * the engine's layout candidates elsewhere — nearly all of its time — so they can run in parallel.
 */
export const layout = async (
  source: string,
  options: Pick<MermaidEngine.CompileOptions, 'emitCandidate'> = {},
): Promise<Scene.WorldObject[]> => {
  const commands = await MermaidEngine.compile(source, options);
  return commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
};
