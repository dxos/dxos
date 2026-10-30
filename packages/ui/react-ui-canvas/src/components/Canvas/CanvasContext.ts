//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';

import { createContext } from '@dxos/react-hooks';
import { type Bounds, type Size, type ViewId } from '@dxos/scene';

import {
  type CanvasAtoms,
  type CanvasController,
  type EditingCommands,
  type LookCommands,
  type NavigationCommands,
  type Projection,
  type SelectionCommands,
  type ToolsCommands,
} from '../../engine/index.ts';
import { type GeneratorFrames } from '../../generator/index.ts';
import {
  type DocumentCommands,
  type ElementHandlers,
  type ObjectActions,
  type PointerMachine,
  type SceneCamera,
  type useRegistry,
} from '../../hooks/index.ts';
import {
  type BackgroundGrid,
  type Capabilities,
  type LinkRegistry,
  type NodeRegistry,
  type SceneLook,
  type ThemeRegistry,
  type View,
  type ViewStore,
} from '../../model/index.ts';

/**
 * What `Canvas.Root` gives every part (DESIGN.md §13.1): the services, the atoms and the controller. Nothing here
 * changes with the view state, only with the View, the mode or the host's props, so a part re-renders for the atoms it
 * reads rather than because the context changed.
 */
export type CanvasServices = {
  registry: ReturnType<typeof useRegistry>;
  /** The canvas's commands by aspect, made once per canvas (DESIGN.md §13). */
  controller: CanvasController;
  atoms: CanvasAtoms;
  store: ViewStore;
  /** The canvas's root View, which navigation starts from. */
  root: ViewId;
  projection: Projection;
  capabilities: Capabilities;
  /** The scene is only looked at: the parts that edit it (selection frame, ports, actions, properties) hide. */
  readonly: boolean;
  /** No surface is drawn under the scene. */
  transparent: boolean;
  /** Toggles `readonly`; absent when the host does not offer the toggle. */
  onReadonlyChange?: (readonly: boolean) => void;
  nodeRegistry: NodeRegistry;
  linkRegistry: LinkRegistry;
  /** Minor grid spacing in scene px. */
  grid: number;
  /** Fit mode: the camera keeps the scene framed until the user pans or zooms. */
  fitting: Atom.Atom<boolean>;
  document: DocumentCommands;
  objectActions: ObjectActions;
};

export const [CanvasServicesProvider, useCanvasServices] = createContext<CanvasServices>('Canvas.Root');

/** An aspect's slice of the canvas: the atoms holding its state and the commands that change it. */
export type CanvasAspect<Atoms, Commands> = { atoms: Atoms; commands: Commands };

/** What the canvas shows, and the one write path. */
export const useCanvasDocument = (consumer: string) => {
  const { store, root, projection, capabilities, readonly, nodeRegistry, linkRegistry, document, controller } =
    useCanvasServices(consumer);
  return {
    store,
    root,
    projection,
    capabilities,
    readonly,
    nodeRegistry,
    linkRegistry,
    document,
    intents: controller.document,
  };
};

/** Where the camera is and which View is open. */
export const useCanvasNavigation = (
  consumer: string,
): CanvasAspect<
  Pick<CanvasAtoms, 'camera' | 'path' | 'history' | 'isolation'> & { fitting: Atom.Atom<boolean> },
  NavigationCommands
> => {
  const { atoms, fitting, controller } = useCanvasServices(consumer);
  const { camera, path, history, isolation } = atoms;
  return { atoms: { camera, path, history, isolation, fitting }, commands: controller.navigation };
};

/** What is selected or under the pointer. */
export const useCanvasSelection = (
  consumer: string,
): CanvasAspect<Pick<CanvasAtoms, 'selection' | 'hover' | 'linkHover' | 'point'>, SelectionCommands> => {
  const { atoms, controller } = useCanvasServices(consumer);
  const { selection, hover, linkHover, point } = atoms;
  return { atoms: { selection, hover, linkHover, point }, commands: controller.selection };
};

/** The active tool and the grid aids. */
export const useCanvasTools = (
  consumer: string,
): CanvasAspect<
  Pick<CanvasAtoms, 'tool' | 'linkType' | 'layer' | 'snap' | 'guides' | 'axes' | 'debug'>,
  ToolsCommands
> => {
  const { atoms, controller } = useCanvasServices(consumer);
  const { tool, linkType, layer, snap, guides, axes, debug } = atoms;
  return { atoms: { tool, linkType, layer, snap, guides, axes, debug }, commands: controller.tools };
};

/**
 * Theme and background. The look is the host's props resolved, so it rides its own provider, which changes only when
 * they do; a picker's handler is absent when the host takes no changes, which hides the picker.
 */
export type CanvasLook = {
  /** The theme, style set and background the view draws with. */
  look: SceneLook;
  themes: ThemeRegistry;
  /** The theme chosen for the drawing over the default, if any. */
  themeOverride?: string;
  /** The grid the theme's own background draws. */
  themeGrid: BackgroundGrid;
  setTheme?: LookCommands['setTheme'];
  setBackgroundGrid?: LookCommands['setBackgroundGrid'];
};

export const [CanvasLookProvider, useCanvasLook] = createContext<CanvasLook>('Canvas.Root');

/** The clock the view draws at; its own provider, as only an animated view's parts read it. */
export type CanvasTime = {
  atoms: { time: CanvasAtoms['clock']['time']; playing: CanvasAtoms['clock']['playing'] };
  /** What the scene's generators drew, and for which time: the generator host's output, which it hands over as it comes. */
  generated: GeneratorFrames | undefined;
};

export const [CanvasTimeProvider, useCanvasTime] = createContext<CanvasTime>('Canvas.Root');

/** Edit mode (a node's text or vertices) and the clipboard; its own provider, as a host may mount a view that edits nothing. */
export type CanvasEditing = CanvasAspect<Pick<CanvasAtoms, 'editing' | 'active' | 'clipboard'>, EditingCommands>;

export const [CanvasEditingProvider, useCanvasEditing] = createContext<CanvasEditing>('Canvas.Root');

/**
 * The pointer gesture in flight, read by the Viewport alone: the pointer machine's handlers and what a gesture draws.
 * It changes as the gesture does, which is why it is not in the services.
 */
export type CanvasGesture = {
  /** The scene as drawn while a gesture is in flight. */
  displayScene: View;
  /** The gesture in flight would be refused by the projection (e.g. an overlap on the lattice). */
  blocked: boolean;
  /** The bounds a create gesture would land, drawn whether or not the node itself previews. */
  createFrame: Bounds | undefined;
  /** Where the nodes of a move in flight will land, while they follow the pointer. */
  landing: readonly Bounds[] | undefined;
  handlers: ElementHandlers;
  /** The current scene's frame, kept for the visit (the controller's `navigation.frame`). */
  bounds: Bounds;
  /** The view's size in screen px, which gestures land in. */
  viewport: Size;
  /** Whether the viewport has been measured; the scene stays hidden until it has. */
  measured: boolean;
} & Pick<SceneCamera, 'navigating' | 'opening'> &
  Pick<
    PointerMachine,
    | 'onHandlePointerDown'
    | 'onPortPointerDown'
    | 'onEndPointerDown'
    | 'onPointPointerDown'
    | 'onMidpointPointerDown'
    | 'onPointContextMenu'
    | 'onVertexPointerDown'
    | 'onVertexMidpointPointerDown'
    | 'removePoint'
    | 'menu'
    | 'closeMenu'
    | 'menuAnchorRef'
  >;

export const [CanvasGestureProvider, useCanvasGesture] = createContext<CanvasGesture>('Canvas.Root');
