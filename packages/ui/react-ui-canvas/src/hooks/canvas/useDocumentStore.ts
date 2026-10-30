//
// Copyright 2026 DXOS.org
//

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { type Scene, type ViewId, applyIntent, findLayout, rootScene, sceneLayout } from '@dxos/scene';

import { type ConstrainIntent, type ViewportProps } from '../../editor/index.ts';
import { type MemoryViewStore, type ViewMap, createMemoryStore } from '../../model/index.ts';
import {
  type LayoutWrite,
  applyLayoutWrites,
  layoutWrites,
  styleClasses,
  toRenderLists2D,
} from '../../viewport2d/index.ts';
import { type useRegistry } from '../useRegistry.ts';

export type DocumentStoreOptions = Partial<Pick<ViewportProps, 'onIntent' | 'onModelIntent' | 'onTransaction'>> & {
  document: Scene.SceneDocument;
  /** The scene drawn, by id; the document's root scene when unset. */
  scene?: string;
  /** The layout's mode, applied to every write; a refused or rewritten drag is redrawn as stored. */
  constrain?: ConstrainIntent;
  /** Whether the mode snaps the write, read when it is made. */
  snap: () => boolean;
};

/** The scene's root layout, as {@link toRenderLists2D} draws it: its own 2D layout, else the document's first. */
export const rootLayoutOf = (document: Scene.SceneDocument, scene?: string): ViewId => {
  const record =
    (scene === undefined ? undefined : document.scenes.find(({ id }) => id === scene)) ?? rootScene(document);
  const own = sceneLayout(document, record);
  return (own?.dim === '2d' ? own.id : undefined) ?? document.layouts.find((layout) => layout.dim === '2d')?.id ?? '';
};

/** Whether two versions of a layout draw any element in a different place or size (a pin alone draws the same). */
const drawnDifferently = (left: Scene.LayoutRecord, right: Scene.LayoutRecord): boolean => {
  const frame = (layout: Scene.LayoutRecord, id: string) => {
    const element = layout.elements[id];
    return JSON.stringify(element && [element.center, 'size' in element ? element.size : undefined]);
  };
  const ids = new Set([...Object.keys(left.elements), ...Object.keys(right.elements)]);
  return [...ids].some((id) => frame(left, id) !== frame(right, id));
};

/**
 * The engine's draw state over a document (COMMON-CORE C.2): the scene's layouts as render lists, read again whenever
 * the document changes and never written back. A gesture redraws the lists in memory as it goes; what it leaves on
 * release reaches the host as one intent per changed layout ({@link layoutWrites}), and a write the layout's mode
 * refuses or moves is drawn as stored until the document comes back with it.
 */
export const useDocumentStore = (
  registry: ReturnType<typeof useRegistry>,
  { document, scene, constrain, snap, onIntent, onModelIntent, onTransaction }: DocumentStoreOptions,
): { store: MemoryViewStore; root: ViewId } => {
  const sceneRecord =
    (scene === undefined ? undefined : document.scenes.find(({ id }) => id === scene)) ?? rootScene(document);
  const read = (doc: Scene.SceneDocument) => toRenderLists2D(doc, sceneRecord);
  const initial = useMemo(() => read(document), [scene]);
  const root = initial.root;
  const rootModel = (doc: Scene.SceneDocument) => {
    const layout = findLayout(doc, root);
    return (layout?.dim === '2d' ? layout.model : undefined) ?? doc.models.find((model) => model.dim === '2d')?.id;
  };
  const stylesOf = (doc: Scene.SceneDocument) => {
    const model = doc.models.find((model) => model.id === rootModel(doc));
    return styleClasses(model?.dim === '2d' ? model.styles : undefined);
  };
  const store = useMemo(() => createMemoryStore(initial.lists, stylesOf(document), { root }), [initial]);

  // The latest props, read by the store's subscription, which outlives a render.
  const latest = useRef({ document, constrain, snap, onIntent, onModelIntent, onTransaction });
  latest.current = { document, constrain, snap, onIntent, onModelIntent, onTransaction };
  const reading = useRef(false);
  const last = useRef<ViewMap>(registry.get(store.views));

  // The document as stored, read into the draw state before paint, so an animation's samples draw in their own frame.
  useLayoutEffect(() => {
    reading.current = true;
    try {
      const lists: ViewMap = Object.fromEntries(read(document).lists.map((list) => [list.id, list]));
      registry.set(store.views, lists);
      registry.set(store.styles, stylesOf(document));
      last.current = lists;
    } finally {
      reading.current = false;
    }
  }, [registry, store, document]);

  // The engine's changes, as intents on the layouts they changed.
  useEffect(
    () =>
      registry.subscribe(store.views, (lists) => {
        if (reading.current) {
          return;
        }
        const { document: doc, constrain: mode, snap: snapping, onIntent: write, ...handlers } = latest.current;
        const writes = layoutWrites(doc, last.current, lists);
        // Whether the layout's mode refuses or rewrites one of the writes to a stored layout.
        const changedByMode = (next: LayoutWrite): boolean => {
          const record = next.kind === 'layout' && !next.created ? findLayout(doc, next.layout) : undefined;
          if (!mode || !record || next.kind !== 'layout') {
            return false;
          }
          const constrained = mode(record, next.intent, { snap: snapping() });
          return (
            constrained === undefined ||
            drawnDifferently(applyIntent(record, constrained), applyIntent(record, next.intent))
          );
        };
        // With no host to take it, or a mode that moves it, the change is drawn as stored until the document lands.
        if (!write || writes.some(changedByMode)) {
          reading.current = true;
          try {
            registry.set(store.views, last.current);
          } finally {
            reading.current = false;
          }
        } else {
          last.current = lists;
        }
        write && applyLayoutWrites(writes, { model: rootModel(doc), onIntent: write, ...handlers });
      }),
    [registry, store],
  );

  return { store, root };
};
