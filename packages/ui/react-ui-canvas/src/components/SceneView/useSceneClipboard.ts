//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { type useRegistry } from '../../hooks/index.ts';
import { type SceneViewAtoms } from '../../model/atoms.ts';
import { type Projection } from '../../model/projection.ts';
import { type Capabilities, type ElementId, type Point, type Scene } from '../../model/types.ts';
import { clipboardBounds, copySelection, pasteFragment } from '../../utils/clipboard.ts';
import { between, topZ } from '../../utils/order.ts';
import { type SceneSnap } from './useSceneSnap.ts';

export type UseSceneClipboardOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: SceneViewAtoms;
  scene: Scene;
  projection: Projection;
  capabilities: Capabilities;
  select: (ids: Iterable<ElementId>) => void;
  createId: (prefix: string) => string;
} & Pick<SceneSnap, 'major' | 'snap'>;

export type SceneClipboard = {
  /** Whether anything was copied: a cut only deletes once the fragment is safely in the clipboard. */
  copy: () => boolean;
  cut: () => void;
  paste: (at?: Point) => void;
};

/**
 * Copy, cut and paste over the scene's own clipboard atom rather than the system one, so a fragment keeps
 * its links and z keys. Pasting repeatedly walks the copy away from the original instead of stacking it.
 */
export const useSceneClipboard = ({
  registry,
  atoms,
  scene,
  projection,
  capabilities,
  select,
  createId,
  major,
  snap,
}: UseSceneClipboardOptions): SceneClipboard => {
  const copy = useCallback(() => {
    const fragment = copySelection(scene, registry.get(atoms.selection));
    if (fragment) {
      registry.set(atoms.clipboard, fragment);
    }
    return fragment !== undefined;
  }, [scene, registry, atoms.selection, atoms.clipboard]);

  const cut = useCallback(() => {
    if (!capabilities.delete || !copy()) {
      return;
    }
    projection.apply({ kind: 'delete', ids: [...registry.get(atoms.selection)] });
    select([]);
  }, [capabilities.delete, copy, projection, registry, atoms.selection, select]);

  /** Paste one grid step further each time, or with the fragment's top-left at `at` when given. */
  const paste = useCallback(
    (at?: Point) => {
      const fragment = registry.get(atoms.clipboard);
      if (!fragment || !capabilities.create) {
        return;
      }
      const bounds = clipboardBounds(fragment);
      const step = major * (fragment.pasted + 1);
      const offset = at && bounds ? { x: snap(at.x) - bounds.x, y: snap(at.y) - bounds.y } : { x: step, y: step };
      let nodeZ = topZ(Object.values(scene.nodes));
      let linkZ = topZ(Object.values(scene.links));
      const { intent, ids } = pasteFragment({
        clipboard: fragment,
        offset,
        createId,
        nodeZ: () => (nodeZ = between(nodeZ, undefined)),
        linkZ: () => (linkZ = between(linkZ, undefined)),
      });
      projection.apply(intent);
      registry.set(atoms.clipboard, { ...fragment, pasted: at ? fragment.pasted : fragment.pasted + 1 });
      select(ids);
    },
    [
      registry,
      atoms.clipboard,
      capabilities.create,
      major,
      snap,
      scene.nodes,
      scene.links,
      projection,
      select,
      createId,
    ],
  );

  return { copy, cut, paste };
};
