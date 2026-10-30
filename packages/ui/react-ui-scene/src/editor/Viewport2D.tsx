//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useContext, useEffect, useMemo, useRef } from 'react';

import { type ModuleCompiler } from '@dxos/animation';
import {
  type Camera,
  Canvas,
  type ConstrainIntent,
  type FreehandProjectionOptions,
  type GeneratorSource,
  type KeyAction,
  type NodeRegistry,
  type Projection,
  type Tool,
  type ViewMap,
  type ViewportProps,
  createCanvasAtoms,
  createMemoryStore,
} from '@dxos/react-ui-canvas';
import { type Scene, applyIntent, findLayout, rootScene } from '@dxos/scene';

import { latticesKey, layoutProjection, styleClasses, toCanvasViews } from '../canvas/index.ts';
import { type CanvasBridge, CanvasBridgeCapture } from './canvas-bridge.tsx';
import { fromTool2D, toTool2D } from './tools2d.ts';
import { type ViewWrite, applyViewWrites, viewWrites } from './view-writes.ts';

/** The shortcuts the shared editor's command table handles, which the 2D engine leaves to it. */
const HOST_KEYS: ReadonlySet<KeyAction> = new Set<KeyAction>([
  'copy',
  'cut',
  'paste',
  'duplicate',
  'undo',
  'redo',
  'group',
  'ungroup',
]);

/** What the host gives the 2D viewport beyond the shared props: its node types, mode and generators. */
export type Viewport2DOptions = {
  /** The node types the canvas draws (a host's object frames among them); the default set when unset. */
  nodes?: NodeRegistry;
  /** The canvas's mode (lattice, constrained, dynamic) over its store; when unset, each layout's own (its lattice). */
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /** The layout's mode, which the editor applies to every write; a refused or rewritten drag is redrawn as stored. */
  constrain?: ConstrainIntent;
  generators?: Readonly<Record<string, GeneratorSource>>;
  compileGenerator?: ModuleCompiler;
  createGeneratorWorker?: () => Worker;
  /** How deep frames draw their live contents. */
  liveDepth?: number;
  /** Where the viewport publishes its canvas, for the Properties form beside it. */
  bridge?: CanvasBridge;
};

const sameIds = (left: Iterable<string>, right: readonly string[]): boolean => {
  const ids = [...left];
  return ids.length === right.length && ids.every((id) => right.includes(id));
};

const sameCamera = (left: Camera | undefined, right: Camera | undefined): boolean =>
  left === right || (!!left && !!right && left.x === right.x && left.y === right.y && left.zoom === right.zoom);

const sameTool = (left: Tool, right: Tool): boolean => JSON.stringify(left) === JSON.stringify(right);

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
 * The 2D viewport the shared editor draws: react-ui-canvas's engine over the open scene's layouts as Views, with its
 * gestures, handles, links and portals. The engine keeps a drag's in-flight state in memory and writes its store once on
 * release; that write reaches the editor as one intent per changed layout ({@link viewWrites}), so the editor records,
 * undoes and shares 2D edits as it does 3D ones. Selection, tool, drill path, camera and display are the editor's,
 * mirrored into the engine's atoms both ways.
 */
export const createViewport2D = (options: Viewport2DOptions = {}) => {
  /** Whether the layout's mode refuses or rewrites one of the engine's writes to a stored layout. */
  const changedByMode = (doc: Scene.SceneDocument, next: ViewWrite, snap: boolean): boolean => {
    const record = next.kind === 'layout' && !next.created ? findLayout(doc, next.layout) : undefined;
    if (!options.constrain || !record || next.kind !== 'layout') {
      return false;
    }
    const constrained = options.constrain(record, next.intent, { snap });
    return (
      constrained === undefined || drawnDifferently(applyIntent(record, constrained), applyIntent(record, next.intent))
    );
  };

  const Viewport2D = ({
    document,
    scene: sceneId,
    editing,
    selection,
    tool,
    readonly,
    picture,
    grid,
    snap,
    axes,
    guides,
    theme,
    camera,
    onSelect,
    onToolChange,
    onIntent,
    onModelIntent,
    onTransaction,
    onEdit,
    onContextMenu,
    onCameraChange,
    onResize,
    children,
  }: ViewportProps<Camera>) => {
    const registry = useContext(RegistryContext);
    const sceneRecord = document.scenes.find((record) => record.id === sceneId) ?? rootScene(document);
    const read = (doc: Scene.SceneDocument) => toCanvasViews(doc, sceneRecord);
    const initial = useMemo(() => read(document), [sceneId]);
    const root = initial.root;
    const rootModel = (doc: Scene.SceneDocument) => {
      const layout = findLayout(doc, root);
      return (layout?.dim === '2d' ? layout.model : undefined) ?? doc.models.find((model) => model.dim === '2d')?.id;
    };
    const stylesOf = (doc: Scene.SceneDocument) => {
      const model = doc.models.find((model) => model.id === rootModel(doc));
      return styleClasses(model?.dim === '2d' ? model.styles : undefined);
    };
    const store = useMemo(() => createMemoryStore(initial.views, stylesOf(document), { root }), [initial]);
    const atoms = useMemo(() => createCanvasAtoms(root), [root]);

    // The latest props, read by the store's subscription, which outlives a render.
    const latest = useRef({ document, snap, onIntent, onModelIntent, onTransaction });
    latest.current = { document, snap, onIntent, onModelIntent, onTransaction };
    const reading = useRef(false);
    const last = useRef<ViewMap>(registry.get(store.views));

    // The document as stored: read into the engine's store, which is not written back.
    useEffect(() => {
      reading.current = true;
      try {
        const views: ViewMap = Object.fromEntries(read(document).views.map((view) => [view.id, view]));
        registry.set(store.views, views);
        registry.set(store.styles, stylesOf(document));
        last.current = views;
      } finally {
        reading.current = false;
      }
    }, [registry, store, document]);

    // The engine's writes, as intents on the layouts they changed.
    useEffect(
      () =>
        registry.subscribe(store.views, (views) => {
          if (reading.current) {
            return;
          }
          const { document: doc, snap: snapping, ...handlers } = latest.current;
          const writes = viewWrites(doc, last.current, views);
          // The engine drew the drag as made; one the mode refuses or moves is drawn as stored until the write lands.
          const constrained = options.constrain && writes.some((next) => changedByMode(doc, next, snapping));
          if (constrained) {
            reading.current = true;
            try {
              registry.set(store.views, last.current);
            } finally {
              reading.current = false;
            }
          } else {
            last.current = views;
          }
          applyViewWrites(writes, { model: rootModel(doc), ...handlers });
        }),
      [registry, store],
    );

    // The editor's state into the engine.
    useEffect(() => {
      sameIds(registry.get(atoms.selection), selection) || registry.set(atoms.selection, new Set(selection));
    }, [registry, atoms, selection]);
    useEffect(() => {
      const next = toTool2D(tool);
      sameTool(registry.get(atoms.tool), next) || registry.set(atoms.tool, next);
    }, [registry, atoms, tool]);
    useEffect(() => {
      const path = editing === undefined || editing === root ? [root] : [root, editing];
      registry.get(atoms.path).at(-1) === path.at(-1) || registry.set(atoms.path, path);
    }, [registry, atoms, editing, root]);
    useEffect(() => {
      camera && !sameCamera(registry.get(atoms.camera), camera) && registry.set(atoms.camera, camera);
    }, [registry, atoms, camera]);
    useEffect(() => registry.set(atoms.snap, snap && !picture), [registry, atoms, snap, picture]);
    useEffect(() => registry.set(atoms.axes, !!axes && !picture), [registry, atoms, axes, picture]);
    useEffect(() => registry.set(atoms.guides, !!guides && !picture), [registry, atoms, guides, picture]);

    // A layout with a lattice snaps the drag itself, so the engine previews the cells it lands on and draws the guides.
    const lattices = latticesKey(document);
    const createProjection = useMemo(
      () => options.createProjection ?? layoutProjection(() => latest.current.document),
      [lattices],
    );

    // The engine's own changes back to the editor.
    const handlers = useRef({ onSelect, onToolChange, onEdit, selection, tool, editing });
    handlers.current = { onSelect, onToolChange, onEdit, selection, tool, editing };
    useEffect(() => {
      const unsubscribe = [
        registry.subscribe(atoms.selection, (ids) => {
          sameIds(ids, handlers.current.selection) || handlers.current.onSelect([...ids]);
        }),
        registry.subscribe(atoms.tool, (next) => {
          sameTool(next, toTool2D(handlers.current.tool)) || handlers.current.onToolChange?.(fromTool2D(next));
        }),
        registry.subscribe(atoms.path, (path) => {
          const open = path.length > 1 ? path.at(-1) : undefined;
          open !== handlers.current.editing && handlers.current.onEdit(open);
        }),
      ];
      return () => unsubscribe.forEach((dispose) => dispose());
    }, [registry, atoms]);

    return (
      <Canvas.Root
        key={root}
        store={store}
        root={root}
        atoms={atoms}
        nodes={options.nodes}
        createProjection={createProjection}
        theme={theme}
        backgroundGrid={grid && !picture ? 'lines' : 'none'}
        readonly={readonly || !!picture}
        transparent={!!picture}
        margin={picture ? 0 : undefined}
        initialCamera={camera}
        onCameraChange={onCameraChange}
        onViewChange={(view) => {
          const zoom = registry.get(atoms.camera).zoom;
          onResize?.({ width: view.width * zoom, height: view.height * zoom });
        }}
        hostKeys={HOST_KEYS}
        onContextMenu={picture ? undefined : onContextMenu}
        generators={options.generators}
        compileGenerator={options.compileGenerator}
        createGeneratorWorker={options.createGeneratorWorker}
      >
        <Canvas.Viewport liveDepth={options.liveDepth} />
        {options.bridge && <CanvasBridgeCapture bridge={options.bridge} />}
        {children}
      </Canvas.Root>
    );
  };
  Viewport2D.displayName = 'Viewport2D';
  return Viewport2D;
};
