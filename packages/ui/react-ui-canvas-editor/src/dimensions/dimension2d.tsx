//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { type PropsWithChildren, useEffect, useLayoutEffect, useMemo } from 'react';

import { type ModuleCompiler } from '@dxos/animation';
import {
  type ActiveTool,
  type Camera,
  Canvas,
  type CanvasController,
  type Capabilities,
  type ConstrainIntent,
  type FaceSelection,
  type GeneratorSource,
  type KeyAction,
  type Kinds,
  type NodeRegistry,
  createCanvasAtoms,
  fromViewportIntent,
  rootLayoutOf,
  toViewportDocument,
  useCanvasServices,
} from '@dxos/react-ui-canvas';
import { type LayoutIntent, type Scene, findLayout } from '@dxos/scene';

import { type Dimension, type DimensionContext, type EditorNavigation, keep, useSceneLook } from '../editor/index.ts';
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

/** What the host gives the 2D dimension: its node types, mode and generators, and how its own kinds are drawn. */
export type Dimension2DOptions = {
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
  /**
   * The document as the engine draws it, a hook called on each render (a host's element fields, or runtime ports, where
   * the engine reads them); `kinds`' fields lifted when unset.
   */
  useDrawnDocument?: (document: Scene.SceneDocument) => Scene.SceneDocument;
  /** Each intent the engine writes, lifted back to the stored record's shape before the editor records it. */
  liftIntent?: (intent: LayoutIntent, layout: Scene.LayoutRecord2D) => LayoutIntent;
};

/** Major cells between a picture's content and its edge: enough that no edge or shadow is cut, and no more. */
const PICTURE_MARGIN = 0.25;

const NO_PATH: readonly string[] = [];

const useStoredDocument = (document: Scene.SceneDocument) => document;

/** How `kinds` are drawn: each kind's element with its fields where the engine reads them, and lifted back. */
const kindsDrawing = (kinds: Kinds) => ({
  useDrawnDocument: (document: Scene.SceneDocument) => useMemo(() => toViewportDocument(document, kinds), [document]),
  liftIntent: (intent: LayoutIntent, layout: Scene.LayoutRecord2D) => fromViewportIntent(intent, layout, kinds),
});

/**
 * The 2D dimension: react-ui-canvas's engine round the whole editor, its atoms the editor's selection, tool, drill path
 * and camera, and its controller the camera bar's and crumbs' commands, so no state is held twice. The engine sends each
 * edit on release as one intent per changed layout, so the editor records, undoes and shares 2D edits as it does 3D ones.
 */
export const createDimension2D =
  (options: Dimension2DOptions = {}) =>
  ({ registry, document, camera, setMenu }: DimensionContext<Camera>): Dimension => {
    const { atoms } = document;
    const root = rootLayoutOf(registry.get(atoms.document), registry.get(atoms.scene));
    const canvas = createCanvasAtoms(root);
    const drawing = options.kinds ? kindsDrawing(options.kinds) : undefined;
    const useDrawnDocument = options.useDrawnDocument ?? drawing?.useDrawnDocument ?? useStoredDocument;
    const liftIntent = options.liftIntent ?? drawing?.liftIntent;
    // The engine's commands while its root is mounted: a handle on them, never a copy of its state.
    const engine: { controller?: CanvasController } = {};

    const selection = Atom.keepAlive(
      Atom.writable<readonly string[], readonly string[]>(
        (get) => [...get(canvas.selection)],
        (ctx, ids) => ctx.set(canvas.selection, new Set(ids)),
      ),
    );
    const tool = Atom.keepAlive(
      Atom.writable<ActiveTool, ActiveTool>(
        (get) => fromTool2D(get(canvas.tool)),
        (ctx, next) => ctx.set(canvas.tool, toTool2D(next)),
      ),
    );
    const face = keep<FaceSelection | undefined>(undefined);
    // An isolated composite is the engine's own view, outside the drill path, which stays where it was.
    const path = Atom.keepAlive(
      Atom.make((get) => {
        const drilled = get(canvas.isolation)?.back.path ?? get(canvas.path);
        return drilled.length > 1 ? drilled : NO_PATH;
      }),
    );
    const zoomable = Atom.keepAlive(
      Atom.make((get) => get(camera.authored) !== undefined && (get(atoms.picture) || get(atoms.host).camera)),
    );
    const percent = Atom.keepAlive(
      Atom.make((get) => {
        const authored = get(camera.authored);
        return authored ? Math.round((get(canvas.camera).zoom / authored.zoom) * 100) : undefined;
      }),
    );
    const move = (command: (controller: CanvasController) => void) =>
      registry.get(zoomable) && engine.controller && command(engine.controller);
    const navigation: EditorNavigation = {
      atoms: { path, zoomable, percent },
      commands: {
        open: (next) => engine.controller?.navigation.openView(next.length > 0 ? next : [root], { select: [] }),
        fit: () => move((controller) => controller.navigation.fit()),
        actual: () => move((controller) => controller.navigation.resetZoom()),
        zoomBy: (factor) => move((controller) => controller.navigation.zoomBy(factor)),
      },
    };

    const onIntent = (layout: string, intent: LayoutIntent) => {
      // A layout the write creates (a new portal's scene) has no stored elements to keep values from.
      const record = findLayout(registry.get(atoms.document), layout) ?? { id: layout, dim: '2d', elements: {} };
      document.commands.intent(layout, liftIntent && record.dim === '2d' ? liftIntent(intent, record) : intent);
    };
    // The engine restores only the camera it opened with; a picture opens fitted, under its own zoom bar.
    const initialCamera = registry.get(atoms.picture) ? undefined : registry.get(camera.host);
    const onContextMenu = (at: { x: number; y: number }, kind: 'element' | 'canvas') => setMenu({ at, kind });

    /** Binds the engine's controller to the editor's commands while the root is mounted. */
    const Bind = () => {
      const { controller } = useCanvasServices('SceneEditor.Root2D');
      useLayoutEffect(() => {
        engine.controller = controller;
        return () => {
          engine.controller === controller && (engine.controller = undefined);
        };
      }, [controller]);
      return null;
    };

    const Root: Dimension['Root'] = ({ Frame, children }) => {
      const { display } = useSceneLook('SceneEditor.Root2D');
      const drawn = useDrawnDocument(useAtomValue(atoms.shown));
      const scene = useAtomValue(atoms.scene);
      const readonly = useAtomValue(atoms.readonly);
      const picture = useAtomValue(atoms.picture);
      const offers = useAtomValue(atoms.host);
      const editing = !picture;
      // The display panel's aids are the host's, kept by the engine as atoms of its own, so they go one way.
      useEffect(() => registry.set(canvas.snap, editing && display.snap), [editing, display.snap]);
      useEffect(() => registry.set(canvas.axes, editing && (display.axes ?? false)), [editing, display.axes]);
      useEffect(() => registry.set(canvas.guides, editing && (display.guides ?? false)), [editing, display.guides]);
      return (
        <Canvas.Root
          document={drawn}
          scene={scene}
          constrain={options.constrain}
          onIntent={onIntent}
          onModelIntent={offers.model ? document.commands.modelIntent : undefined}
          onTransaction={document.commands.transaction}
          atoms={canvas}
          nodes={options.nodes}
          capabilities={options.capabilities}
          theme={display.theme}
          backgroundGrid={editing && display.grid ? 'lines' : 'none'}
          readonly={readonly}
          transparent={picture}
          margin={picture ? PICTURE_MARGIN : undefined}
          initialCamera={initialCamera}
          onCameraChange={editing && offers.camera ? camera.report : undefined}
          hostKeys={HOST_KEYS}
          onContextMenu={picture ? undefined : onContextMenu}
          shell={Frame}
          generators={options.generators}
          compileGenerator={options.compileGenerator}
          createGeneratorWorker={options.createGeneratorWorker}
        >
          <Bind />
          {children}
        </Canvas.Root>
      );
    };
    Root.displayName = 'SceneEditor.Root2D';

    const Viewport = ({ children }: PropsWithChildren) => (
      <>
        <Canvas.Viewport liveDepth={options.liveDepth} />
        {children}
      </>
    );
    Viewport.displayName = 'SceneEditor.Viewport2D';

    return {
      navigation,
      selection: {
        atoms: { selection, face },
        commands: {
          select: (ids) => registry.set(selection, ids),
          setFace: (next) => registry.set(face, next),
        },
      },
      tools: { atoms: { tool }, commands: { setTool: (next) => registry.set(tool, next) } },
      Root,
      Viewport,
    };
  };
