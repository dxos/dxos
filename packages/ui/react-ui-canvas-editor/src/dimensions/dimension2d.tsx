//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { type PropsWithChildren, createContext, useContext, useEffect, useLayoutEffect, useMemo } from 'react';

import { type ModuleCompiler } from '@dxos/animation';
import {
  type ActiveTool,
  type Camera,
  Canvas,
  type CanvasAtoms,
  type CanvasController,
  type CanvasRootProps,
  type CanvasServices,
  type Capabilities,
  type ConstrainIntent,
  type FaceSelection,
  type GeneratorSource,
  type KeyAction,
  type Kinds,
  type NodeRegistry,
  createCanvasAtoms,
  fromViewportIntent,
  getElement,
  rootLayoutOf,
  toViewportDocument,
  useCanvasServices,
} from '@dxos/react-ui-canvas';
import { type LayoutIntent, MAJOR_GRID, type Scene, findLayout, isInstanceNode, isLink } from '@dxos/scene';

import {
  type Dimension,
  type DimensionCommand,
  type DimensionContext,
  type EditorNavigation,
  type EngineEdit,
  drawnGrid,
  keep,
  useSceneLook,
} from '../editor/index.ts';
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

/**
 * `Canvas.Root` props a host sets beyond the editor's, for a 2D canvas it drives itself (a drift across the scene, a view
 * listener, a refit timed to its own reveal); they change as the host renders, so they ride a context.
 */
export type Canvas2DHostProps = Pick<CanvasRootProps, 'drift' | 'onViewChange' | 'refitKey' | 'refitDuration'>;

const Canvas2DHostContext = createContext<Canvas2DHostProps>({});

export const Canvas2DHost = Canvas2DHostContext.Provider;

/** What the host gives the 2D dimension: its node types, mode and generators, and how its own kinds are drawn. */
export type Dimension2DOptions = {
  /** The node types the canvas draws (a host's object frames among them); the default set when unset. */
  nodes?: NodeRegistry;
  /** The engine's view state, when the host reads it too (a scorecard over the selection); the editor's own when unset. */
  atoms?: CanvasAtoms;
  /**
   * The engine keeps its own shortcuts, undo, clipboard and context menu, for a host that gives the editor no history or
   * codec (`CanvasEditor`).
   */
  standalone?: boolean;
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
    const canvas = options.atoms ?? createCanvasAtoms(root);
    const drawing = options.kinds ? kindsDrawing(options.kinds) : undefined;
    const useDrawnDocument = options.useDrawnDocument ?? drawing?.useDrawnDocument ?? useStoredDocument;
    const liftIntent = options.liftIntent ?? drawing?.liftIntent;
    // The engine's commands while its root is mounted: a handle on them, never a copy of its state.
    const engine: { controller?: CanvasController } = {};
    // The engine's services while mounted, for the commands that read the engine's own state (its undo history).
    const services = keep<CanvasServices | undefined>(undefined);

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
    // An isolated composite is opened on its own, past the place it was opened from, so a crumb leads back out.
    const path = Atom.keepAlive(
      Atom.make((get) => {
        const isolation = get(canvas.isolation);
        const drilled = isolation ? [...isolation.back.path, isolation.composite] : get(canvas.path);
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

    const capable = (key: 'create' | 'delete' | 'layout') =>
      Atom.keepAlive(
        Atom.make((get) => {
          const canvas = get(services);
          return canvas !== undefined && !canvas.readonly && canvas.capabilities[key] === true;
        }),
      );
    const run = (command: (canvas: CanvasServices) => void) => () => {
      const canvas = registry.get(services);
      canvas && command(canvas);
    };
    const canCreate = capable('create');
    const commands: DimensionCommand[] = [
      {
        id: 'layout',
        label: 'Auto layout',
        icon: 'ph--tree-structure--regular',
        enabled: capable('layout'),
        run: run((canvas) => canvas.document.layout()),
      },
      // The engine's debug overlay, for the hosts that draw a canvas on its own (samples, e2e suites).
      ...(options.standalone
        ? [
            {
              id: 'debug',
              label: 'Debug: label every frame with its id, type and geometry',
              icon: 'ph--bug--regular',
              enabled: Atom.make(true),
              pressed: canvas.debug,
              run: run((engine) => engine.controller.tools.toggleDebug()),
            },
          ]
        : []),
    ];

    // A host with no history or codec has the engine's own undo and clipboard behind the shared commands.
    const selected = (needs: (elements: ReturnType<typeof getElement>[], engine: CanvasServices) => boolean) =>
      Atom.keepAlive(
        Atom.make((get) => {
          const engine = get(services);
          const ids = [...get(canvas.selection)];
          if (!engine || engine.readonly || ids.length === 0) {
            return false;
          }
          const scene = get(engine.draw.scene);
          return needs(
            ids.map((id) => getElement(scene, id)),
            engine,
          );
        }),
      );
    const history = (key: 'canUndo' | 'canRedo') =>
      Atom.keepAlive(
        Atom.make((get) => {
          const engine = get(services);
          return engine !== undefined && !engine.readonly && get(engine.document.history)[key];
        }),
      );
    const nodes = (elements: ReturnType<typeof getElement>[]) =>
      elements.flatMap((element) => (element === undefined || isLink(element) ? [] : [element]));
    const editable = (engine: CanvasServices) =>
      engine.capabilities.create === true && engine.capabilities.delete === true;
    const edits: Dimension['edits'] = options.standalone
      ? ({
          undo: { enabled: history('canUndo'), run: run((engine) => engine.document.undo()) },
          redo: { enabled: history('canRedo'), run: run((engine) => engine.document.redo()) },
          cut: { enabled: selected(() => true), run: run((engine) => engine.controller.editing.cut()) },
          copy: { enabled: selected(() => true), run: run((engine) => void engine.controller.editing.copy()) },
          paste: {
            enabled: Atom.keepAlive(Atom.make((get) => get(canvas.clipboard) !== undefined && get(canCreate))),
            run: run((engine) => engine.controller.editing.paste()),
          },
          duplicate: {
            enabled: selected(() => true),
            run: run((engine) =>
              engine.controller.document.duplicate(registry.get(canvas.selection), { x: MAJOR_GRID, y: MAJOR_GRID }),
            ),
          },
          delete: { enabled: selected(() => true), run: run((engine) => void engine.controller.selection.delete()) },
          // A locked node may not leave its View, so a selection holding one is not grouped.
          group: {
            enabled: selected((elements, engine) => {
              const shapes = nodes(elements);
              return editable(engine) && shapes.length > 0 && shapes.every((node) => !node.locked);
            }),
            run: run((engine) => void engine.controller.selection.group()),
          },
          ungroup: {
            enabled: selected((elements, engine) => editable(engine) && nodes(elements).some(isInstanceNode)),
            run: run((engine) => void engine.controller.selection.ungroup()),
          },
        } satisfies Partial<Record<string, EngineEdit>>)
      : undefined;

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
      const canvasServices = useCanvasServices('SceneEditor.Root2D');
      const { controller } = canvasServices;
      useLayoutEffect(() => {
        engine.controller = controller;
        return () => {
          engine.controller === controller && (engine.controller = undefined);
        };
      }, [controller]);
      useLayoutEffect(() => {
        registry.set(services, canvasServices);
        return () => {
          registry.get(services) === canvasServices && registry.set(services, undefined);
        };
      }, [canvasServices]);
      return null;
    };

    const Root: Dimension['Root'] = ({ Frame, children }) => {
      const { display, options: look } = useSceneLook('SceneEditor.Root2D');
      const drawn = useDrawnDocument(useAtomValue(atoms.shown));
      const scene = useAtomValue(atoms.scene);
      const readonly = useAtomValue(atoms.readonly);
      const picture = useAtomValue(atoms.picture);
      const offers = useAtomValue(atoms.host);
      const host = useContext(Canvas2DHostContext);
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
          backgroundGrid={editing ? drawnGrid(look, display) : 'none'}
          readonly={readonly}
          transparent={picture}
          margin={picture ? PICTURE_MARGIN : undefined}
          initialCamera={initialCamera}
          onCameraChange={editing && offers.camera ? camera.report : undefined}
          hostKeys={options.standalone ? undefined : HOST_KEYS}
          onContextMenu={picture || options.standalone ? undefined : onContextMenu}
          shell={Frame}
          generators={options.generators}
          compileGenerator={options.compileGenerator}
          createGeneratorWorker={options.createGeneratorWorker}
          {...host}
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
      tools: {
        atoms: { tool },
        commands: {
          setTool: (next) => registry.set(tool, next),
          create: (kind) => registry.get(services)?.document.create(kind),
        },
      },
      Root,
      Viewport,
      shortcuts: !options.standalone,
      commands,
      edits,
      aids: {
        snap: canvas.snap,
        guides: canvas.guides,
        axes: canvas.axes,
        lattice: Atom.keepAlive(Atom.make((get) => get(services)?.draw.lattice !== undefined)),
      },
    };
  };
