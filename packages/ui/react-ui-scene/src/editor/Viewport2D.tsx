//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { type ComponentType, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { type ModuleCompiler } from '@dxos/animation';
import {
  type Camera,
  Canvas,
  type Capabilities,
  type ConstrainIntent,
  type FreehandProjectionOptions,
  type GeneratorSource,
  type KeyAction,
  type NodeRegistry,
  type Projection,
  type Tool,
  type ViewportProps,
  createCanvasAtoms,
  rootLayoutOf,
} from '@dxos/react-ui-canvas';
import { type LayoutIntent, findLayout } from '@dxos/scene';

import { type Kinds, fromViewportIntent, latticesKey, layoutProjection, toViewportDocument } from '../canvas/index.ts';
import { type CanvasBridge, CanvasBridgeCapture } from './canvas-bridge.tsx';
import { fromTool2D, toTool2D } from './tools2d.ts';

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
  /** The plugin element kinds among `nodes`, whose elements keep their own fields at their top (decision 13). */
  kinds?: Kinds;
  /** The canvas's mode (lattice, constrained, dynamic) over its store; when unset, each layout's own (its lattice). */
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /** The layout's mode, which the editor applies to every write; a refused or rewritten drag is redrawn as stored. */
  constrain?: ConstrainIntent;
  /** What a person may do, within what the mode allows (a generated graph moves its shapes only); all of it when unset. */
  capabilities?: Capabilities;
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

const CAPABILITIES = [
  'move',
  'resize',
  'link',
  'create',
  'delete',
  'update',
  'layout',
] as const satisfies readonly (keyof Capabilities)[];

/** `projection` allowing only what `allowed` also allows. */
const withCapabilities = (projection: Projection, allowed: Capabilities): Projection => ({
  ...projection,
  capabilities: Object.fromEntries(CAPABILITIES.map((key) => [key, !!projection.capabilities[key] && !!allowed[key]])),
});

/**
 * The 2D viewport the shared editor draws: react-ui-canvas's engine over the open scene's layouts, with its gestures,
 * handles, links and portals. The engine sends each edit on release as one intent per changed layout, so the editor
 * records, undoes and shares 2D edits as it does 3D ones. Selection, tool, drill path, camera and display are the
 * editor's, mirrored into the engine's atoms both ways.
 */
export const createViewport2D = (options: Viewport2DOptions = {}) => {
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
    const root = useMemo(() => rootLayoutOf(document, sceneId), [sceneId]);
    const atoms = useMemo(() => createCanvasAtoms(root), [root]);
    // The document the projection reads, which outlives a render.
    const latest = useRef(document);
    latest.current = document;

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
    const createProjection = useMemo(() => {
      const create = options.createProjection ?? layoutProjection(() => latest.current);
      const allowed = options.capabilities;
      return allowed
        ? (projection: FreehandProjectionOptions) => withCapabilities(create(projection), allowed)
        : create;
    }, [lattices]);

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
        document={document}
        scene={sceneId}
        constrain={options.constrain}
        onIntent={onIntent}
        onModelIntent={onModelIntent}
        onTransaction={onTransaction}
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
  return options.kinds ? withKinds(Viewport2D, options.kinds) : Viewport2D;
};

/** The viewport over `kinds`: each kind's element drawn with its fields where the engine reads them, and lifted back. */
const withKinds = (Base: ComponentType<ViewportProps<Camera>>, kinds: Kinds): ComponentType<ViewportProps<Camera>> => {
  const KindsViewport2D = (props: ViewportProps<Camera>) => {
    const { document, onIntent } = props;
    const drawn = useMemo(() => toViewportDocument(document, kinds), [document]);
    const latest = useRef(document);
    latest.current = document;
    const handleIntent = useCallback(
      (layout: string, intent: LayoutIntent) => {
        // A layout the write creates (a new portal's scene) has no stored elements to keep values from.
        const record = findLayout(latest.current, layout) ?? { id: layout, dim: '2d', elements: {} };
        onIntent(layout, record.dim === '2d' ? fromViewportIntent(intent, record, kinds) : intent);
      },
      [onIntent],
    );
    return <Base {...props} document={drawn} onIntent={handleIntent} />;
  };
  KindsViewport2D.displayName = 'KindsViewport2D';
  return KindsViewport2D;
};
