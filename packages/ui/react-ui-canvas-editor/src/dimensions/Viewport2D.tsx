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
  type GeneratorSource,
  type KeyAction,
  type Kinds,
  type NodeRegistry,
  type Tool,
  type ViewportProps,
  createCanvasAtoms,
  fromViewportIntent,
  rootLayoutOf,
  toViewportDocument,
  useCanvasNavigation,
} from '@dxos/react-ui-canvas';
import { type LayoutIntent, findLayout } from '@dxos/scene';

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

const samePath = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);

/**
 * The editor's drill path into the engine: a crumb or a host moving it drills the engine out (or in) through each
 * frame, so the camera maps across as a double-click's would; the engine's own drills reach the editor by `onEdit`.
 */
const DrillSync = ({ root, path }: { root: string; path: readonly string[] }) => {
  const registry = useContext(RegistryContext);
  const { atoms, commands } = useCanvasNavigation('Viewport2D.DrillSync');
  // Only a change of the editor's path drives the engine: the engine's own drills reach the editor first, so reading
  // the engine's path here as a dependency would race them and drill straight back out.
  useEffect(() => {
    const target = path.length > 0 ? path : [root];
    // An isolated composite is the engine's own view, outside the drill path.
    registry.get(atoms.isolation) || samePath(registry.get(atoms.path), target) || commands.openView(target);
  }, [registry, atoms, commands, root, path]);
  return null;
};

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
    path = [],
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

    // The editor's state into the engine.
    useEffect(() => {
      sameIds(registry.get(atoms.selection), selection) || registry.set(atoms.selection, new Set(selection));
    }, [registry, atoms, selection]);
    useEffect(() => {
      const next = toTool2D(tool);
      sameTool(registry.get(atoms.tool), next) || registry.set(atoms.tool, next);
    }, [registry, atoms, tool]);
    // The host's camera is applied when it arrives or changes, never again for the same values: it is the root's camera,
    // so re-applying a fresh object for it would pull a drilled-in view back into the root's coordinates.
    const hostCamera = useRef<Camera | undefined>(undefined);
    useEffect(() => {
      const changed = !sameCamera(hostCamera.current, camera);
      hostCamera.current = camera;
      changed && camera && !sameCamera(registry.get(atoms.camera), camera) && registry.set(atoms.camera, camera);
    }, [registry, atoms, camera]);
    useEffect(() => registry.set(atoms.snap, snap && !picture), [registry, atoms, snap, picture]);
    useEffect(() => registry.set(atoms.axes, !!axes && !picture), [registry, atoms, axes, picture]);
    useEffect(() => registry.set(atoms.guides, !!guides && !picture), [registry, atoms, guides, picture]);

    // The engine's own changes back to the editor.
    const handlers = useRef({ onSelect, onToolChange, onEdit, selection, tool, path });
    handlers.current = { onSelect, onToolChange, onEdit, selection, tool, path };
    useEffect(() => {
      const unsubscribe = [
        registry.subscribe(atoms.selection, (ids) => {
          sameIds(ids, handlers.current.selection) || handlers.current.onSelect([...ids]);
        }),
        registry.subscribe(atoms.tool, (next) => {
          sameTool(next, toTool2D(handlers.current.tool)) || handlers.current.onToolChange?.(fromTool2D(next));
        }),
        registry.subscribe(atoms.path, (next) => {
          // An isolated composite is outside the drill path, which stays where it was.
          const drilled = registry.get(atoms.isolation) ? handlers.current.path : next.length > 1 ? next : [];
          samePath(drilled, handlers.current.path) || handlers.current.onEdit(drilled);
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
        capabilities={options.capabilities}
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
        {!picture && <DrillSync root={root} path={path} />}
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
