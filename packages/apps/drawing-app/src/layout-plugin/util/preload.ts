//
// Copyright 2026 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';

// Opening a diagram loads a chain of objects, each found through the last (drawing, canvas, scene, layout, model), so
// every link costs a round trip to the worker. Loading the ids the diagram reached last time, all at once, collapses
// the chain to one.

const MAX_OBJECTS = 200;

const preloadKey = (drawingId: string) => `org.dxos.diagram-app.preload.${drawingId}`;

/** The ids of the loaded objects `root` reaches through refs, `root` first. */
export const reachedIds = (root: Obj.Unknown): string[] => {
  const seen = new Set<string>();
  const visit = (value: unknown, depth: number) => {
    if (seen.size >= MAX_OBJECTS || depth > 8) {
      return;
    }
    if (Ref.isRef(value)) {
      const target = value.peek();
      if (Obj.isObject(target) && !seen.has(target.id)) {
        seen.add(target.id);
        visit(target, 0);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach((item) => visit(item, depth + 1));
    }
  };
  seen.add(root.id);
  // An object surfaces only once its parent has loaded, so the parents load alongside it.
  for (let parent = Obj.getParent(root); parent && !seen.has(parent.id); parent = Obj.getParent(parent)) {
    seen.add(parent.id);
  }
  visit(root, 0);
  return [...seen];
};

export const savePreload = (drawing: Obj.Unknown) => {
  try {
    localStorage.setItem(preloadKey(drawing.id), JSON.stringify(reachedIds(drawing)));
  } catch {}
};

const readPreload = (drawingId: string): string[] => {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(preloadKey(drawingId)) ?? '[]');
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

/** Starts loading every object the diagram reached last time; the article then finds them loaded. */
export const preloadDrawing = (space: Space, drawingId: string) => {
  for (const entityId of readPreload(drawingId)) {
    void space.db
      .makeRef(EID.make({ entityId }))
      .load()
      // A diagram edited elsewhere may no longer reach every object it did.
      .catch((err) => log.debug('preload missed', { entityId, err }));
  }
};
