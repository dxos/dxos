//
// Copyright 2026 DXOS.org
//

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { type Scene, type ViewId, applyIntent, findLayout, rootScene, sceneLayout } from '@dxos/scene';

import { type DrawState, createDrawState } from '../../engine/index.ts';
import {
  type ConstrainContext,
  type ConstrainIntent,
  type RenderLists2D,
  type ViewportProps,
} from '../../model/index.ts';
import { type SceneEdit, collapseHulls } from '../../utils/index.ts';
import {
  type LayoutWrite,
  applyLayoutWrites,
  constrainEdit,
  drawnDocument,
  drawnLists2D,
  layoutWrites,
  styleClasses,
} from '../../viewport2d/index.ts';
import { type useRegistry } from '../useRegistry.ts';

export type DocumentStoreOptions = Partial<Pick<ViewportProps, 'onIntent' | 'onModelIntent' | 'onTransaction'>> & {
  document: Scene.SceneDocument;
  /** The scene drawn, by id; the document's root scene when unset. */
  scene?: string;
  /** The layout's mode, applied to every write; a refused or rewritten drag is redrawn as stored. */
  constrain?: ConstrainIntent;
  /** What the mode sees of the editor (snapping, to the lattice or the grid), read when a write is made. */
  context: () => ConstrainContext;
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
 *
 * A hull is stored as a group and drawn opened out (`utils/hull-group.ts`), so the lists here hold its nodes in the
 * scene itself: the mode is asked about the scene as drawn, and a change is written with each hull closed again.
 */
export type DocumentStore = {
  store: DrawState;
  root: ViewId;
  /**
   * What the layout's mode would store of `edit` to scene `sceneId`: the edit, the scene as the mode would rewrite it,
   * or undefined when the mode would refuse it; read by the previews of a gesture in flight.
   */
  constrain?: (sceneId: ViewId, edit: SceneEdit) => SceneEdit | undefined;
};

export const useDocumentStore = (
  registry: ReturnType<typeof useRegistry>,
  { document, scene, constrain, context, onIntent, onModelIntent, onTransaction }: DocumentStoreOptions,
): DocumentStore => {
  const sceneRecord =
    (scene === undefined ? undefined : document.scenes.find(({ id }) => id === scene)) ?? rootScene(document);
  const read = (doc: Scene.SceneDocument) => drawnLists2D(doc, sceneRecord);
  // The document as the mode sees it, kept by the document it was drawn from: a gesture asks on every pointer move.
  const drawn = useRef(new WeakMap<Scene.SceneDocument, { document: Scene.SceneDocument; hulls: boolean }>());
  const drawnOf = (doc: Scene.SceneDocument) => {
    const known = drawn.current.get(doc);
    if (known) {
      return known;
    }
    const { lists, opened } = read(doc);
    const next = {
      document: drawnDocument(doc, Object.fromEntries(lists.map((list) => [list.id, list])), opened),
      hulls: opened.size > 0,
    };
    drawn.current.set(doc, next);
    return next;
  };
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
  const store = useMemo(() => createDrawState(initial.lists, stylesOf(document), { root }), [initial]);

  // The latest props, read by the store's subscription, which outlives a render.
  const latest = useRef({ document, constrain, context, onIntent, onModelIntent, onTransaction });
  latest.current = { document, constrain, context, onIntent, onModelIntent, onTransaction };
  const reading = useRef(false);
  const last = useRef<RenderLists2D>(registry.get(store.views));

  // The document as stored, read into the draw state before paint, so an animation's samples draw in their own frame.
  useLayoutEffect(() => {
    reading.current = true;
    try {
      const lists: RenderLists2D = Object.fromEntries(read(document).lists.map((list) => [list.id, list]));
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
        const { document: doc, constrain: mode, context: editor, onIntent: write, ...handlers } = latest.current;
        const shown = drawnOf(doc);
        // What is stored closes each hull into its group first; the mode is asked about the scene as drawn, which is
        // the same thing wherever there is no hull.
        const closed = collapseHulls(lists);
        const writes = layoutWrites(doc, collapseHulls(last.current), closed);
        const asked = shown.hulls || closed !== lists ? layoutWrites(shown.document, last.current, lists) : writes;
        // Whether the layout's mode refuses or rewrites one of the writes to a stored layout.
        const changedByMode = (next: LayoutWrite): boolean => {
          const record = next.kind === 'layout' && !next.created ? findLayout(shown.document, next.layout) : undefined;
          if (!mode || !record || next.kind !== 'layout') {
            return false;
          }
          const constrained = mode(record, next.intent, editor());
          return (
            constrained === undefined ||
            drawnDifferently(applyIntent(record, constrained), applyIntent(record, next.intent))
          );
        };
        // With no host to take it, or a mode that moves it, the change is drawn as stored until the document lands.
        if (!write || asked.some(changedByMode)) {
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

  const preview = useMemo(
    () =>
      (sceneId: ViewId, edit: SceneEdit): SceneEdit | undefined => {
        const { document: doc, constrain: mode, context: editor } = latest.current;
        return mode
          ? constrainEdit(drawnOf(doc).document, registry.get(store.views), sceneId, edit, mode, editor())
          : edit;
      },
    [registry, store],
  );

  return { store, root, constrain: constrain && preview };
};
