//
// Copyright 2026 DXOS.org
//

import { useMemo, useRef } from 'react';

import { type ElementId, type InstanceNode, type NodeId, type Size, type ViewId, isInstanceNode } from '@dxos/scene';

import { type CanvasAtoms, type CanvasHistory, type NavigationCommands, type Projection } from '../../engine/index.ts';
import { type Intent, type View, type ViewStore } from '../../model/index.ts';
import {
  activeLayer,
  compositeBounds,
  copyComposite,
  createId,
  instancePorts,
  isAnonymous,
  promoted,
  removeComposite,
  renamePortLinks,
  retargetInstance,
  screenToScene,
  topZ,
} from '../../utils/index.ts';
import { type useRegistry } from '../useRegistry.ts';

/** The composite-object actions (ANIMATION.md §4.2); each is one undo step. Group and Ungroup are the controller's. */
export type ObjectActions = {
  makeUnique: (id: NodeId) => void;
  duplicate: (composite: ViewId) => void;
  place: (composite: ViewId) => void;
  rename: (composite: ViewId, name: string) => void;
  remove: (composite: ViewId, instances: boolean) => void;
};

export type UseObjectActionsOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  store: ViewStore;
  projection: Projection;
  /** Runs each action as one undo step. */
  commit: CanvasHistory['commit'];
  select: (ids: Iterable<ElementId>) => void;
  navigation: NavigationCommands;
  viewport: Size;
};

/** Composite objects (ANIMATION.md §4.2); an action that adds a scene records it with its step. */
export const useObjectActions = ({
  registry,
  atoms,
  store,
  projection,
  commit: commitStep,
  select,
  navigation,
  viewport,
}: UseObjectActionsOptions): ObjectActions => {
  // Read when an action runs, so the actions keep their identity as the view resizes.
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  return useMemo<ObjectActions>(() => {
    /** Writes `scenes` into the store and applies `intents`, as one undo step. */
    const commit = (scenes: Record<ViewId, View>, intents: Intent[]) =>
      commitStep(() => {
        registry.set(store.views, { ...registry.get(store.views), ...scenes });
        if (intents.length > 0) {
          projection.apply({ kind: 'batch', intents });
        }
      });
    return {
      /** Points an instance at a copy of its composite, so editing one no longer edits the other. */
      makeUnique: (id: NodeId) => {
        const current = registry.get(projection.scene);
        const instance = current.nodes[id];
        const composite =
          instance && isInstanceNode(instance) ? registry.get(store.views)[instance.composite] : undefined;
        // An anonymous Object has the one Instance, so it is already unique.
        if (!instance || !isInstanceNode(instance) || !composite || isAnonymous(composite)) {
          return;
        }
        const copy = copyComposite(composite, createId('object'), createId);
        const unique = retargetInstance(instance, copy.composite.id, copy.rename);
        commit({ [copy.composite.id]: copy.composite }, [
          {
            kind: 'update',
            id,
            values: { composite: unique.composite, overrides: unique.overrides, ports: unique.ports },
          },
          ...renamePortLinks(current, instance, unique),
        ]);
      },
      /** Copies a composite's definition; no instance changes. */
      duplicate: (composite: ViewId) => {
        const definition = registry.get(store.views)[composite];
        if (!definition) {
          return;
        }
        const copy = copyComposite(definition, createId('object'), createId);
        commit({ [copy.composite.id]: copy.composite }, []);
      },
      /** Places an instance of a composite at the centre of the view, at its own size; an anonymous one joins the library. */
      place: (composite: ViewId) => {
        const definition = registry.get(store.views)[composite];
        const content = definition && compositeBounds(definition);
        if (!definition || !content || registry.get(atoms.isolation)) {
          return;
        }
        const camera = registry.get(atoms.camera);
        const { width, height } = viewportRef.current;
        const center = screenToScene(camera, { x: width / 2, y: height / 2 });
        const frame = {
          x: center.x - content.width / 2,
          y: center.y - content.height / 2,
          width: content.width,
          height: content.height,
        };
        const current = registry.get(projection.scene);
        const instance: InstanceNode = {
          type: 'instance',
          id: createId('instance'),
          z: topZ(Object.values(current.nodes)),
          center,
          size: { width: content.width, height: content.height },
          composite,
          ports: instancePorts(frame, definition),
          layer: activeLayer(current, registry.get(atoms.layer)),
        };
        if (isAnonymous(definition)) {
          commit({ [composite]: promoted(definition) }, [{ kind: 'create', node: instance }]);
        } else {
          projection.apply({ kind: 'create', node: instance });
        }
        select([instance.id]);
      },
      /** Names a composite; an anonymous one joins the library. */
      rename: (composite: ViewId, name: string) => {
        const definition = registry.get(store.views)[composite];
        if (definition) {
          commit({ [composite]: { ...promoted(definition), name } }, []);
        }
      },
      /** Removes a composite; with `instances`, every instance of it in the drawing too, else only an unused one. */
      remove: (composite: ViewId, instances: boolean) => {
        const before = registry.get(store.views);
        const path = registry.get(atoms.isolation)?.back.path ?? registry.get(atoms.path);
        const roots = [...path.slice(0, 1), ...Object.keys(before).filter((id) => store.isRoot?.(id))];
        const next = removeComposite(before, composite, { instances, roots });
        if (!next) {
          return;
        }
        if (registry.get(atoms.isolation)?.composite === composite) {
          navigation.exitIsolation();
        }
        commitStep(() => registry.set(store.views, next));
      },
    };
  }, [registry, atoms, store, projection, commitStep, select, navigation]);
};
