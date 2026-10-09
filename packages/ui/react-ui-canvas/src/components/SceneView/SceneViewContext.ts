//
// Copyright 2026 DXOS.org
//

import { type KeyboardEvent, type MouseEvent, type RefObject } from 'react';

import { createContext } from '@dxos/react-hooks';

import { type useRegistry } from '../../hooks/index.ts';
import {
  type ControlPointRef,
  type Drag,
  type EditingPart,
  type PanelMode,
  type SceneViewAtoms,
} from '../../model/atoms.ts';
import { type Projection } from '../../model/projection.ts';
import { type LinkRegistry, type NodeRegistry } from '../../model/registry.ts';
import { type SceneStore } from '../../model/store.ts';
import {
  type Bounds,
  type Camera,
  type Capabilities,
  type ElementId,
  type LinkId,
  type Scene,
  type SceneId,
  type Tool,
} from '../../model/types.ts';
import { type Clipboard } from '../../utils/clipboard.ts';
import { type ElementHandlers } from '../SceneLayer/SceneLayer.tsx';
import { type ToolbarActions } from '../Toolbar/Toolbar.tsx';
import { type PointerMachine } from './usePointerMachine.ts';
import { type SceneCamera } from './useSceneCamera.ts';
import { type SceneClipboard } from './useSceneClipboard.ts';
import { type SceneNavigation } from './useSceneNavigation.ts';

/**
 * What `SceneView.Root` composes and every part reads. The parts are a view onto one machine rather than
 * components with state of their own, so the whole of it is here rather than threaded part by part: a
 * toolbar and the canvas act on the same camera, the same selection and the same projection.
 */
export type SceneViewContextValue = {
  registry: ReturnType<typeof useRegistry>;
  atoms: SceneViewAtoms;
  store: SceneStore;
  projection: Projection;
  capabilities: Capabilities;
  nodeRegistry: NodeRegistry;
  linkRegistry: LinkRegistry;

  /** The scene as stored, and as it is drawn while a gesture is in flight. */
  scene: Scene;
  displayScene: Scene;
  /** The gesture in flight would be refused by the projection (e.g. an overlap on the lattice). */
  blocked: boolean;
  /** The current scene's frame. */
  bounds: Bounds;
  /** The scene's frame and the visible viewport together, for the lattice cells. */
  latticeBounds: Bounds;
  path: SceneId[];
  camera: Camera;
  /** The zoom against this level's own 1:1 rather than the root's; display only. */
  /** The centre of the view in scene coordinates. */
  pointer: { x: number; y: number };
  /** Whether the viewport has been measured; the scene stays hidden until it has. */
  measured: boolean;
  /** One screen pixel in scene units, for chrome that should not grow with the camera. */
  frameUnit: number;
  /** The portal filling most of the view and the opacity of the rest of the layer around it (`layerOpacity`). */
  focus: { id: ElementId; opacity: number } | undefined;
  /** Minor grid spacing in scene px. */
  grid: number;
  snapEnabled: boolean;
  guides: boolean;
  /** On a lattice scene, snap lands on the lattice rather than the basic grid. */
  latticeOn: boolean;

  selection: ReadonlySet<ElementId>;
  hover: ElementId | undefined;
  selectedPoint: ControlPointRef | undefined;
  editing: EditingPart | undefined;
  clipboard: Clipboard | undefined;
  drag: Drag | undefined;
  tool: Tool;
  debug: boolean;
  /** Where the properties and layers panels sit. */
  panels: PanelMode;

  /** The bounds a create gesture would land, drawn whether or not the node itself previews. */
  createFrame: Bounds | undefined;
  /** Where the nodes of a move in flight will land, while they follow the pointer. */
  landing: readonly Bounds[] | undefined;
  handlers: ElementHandlers;
  /** The link under the pointer. */
  linkHover: LinkId | undefined;
  select: (ids: Iterable<ElementId>) => void;
  toolbarActions: ToolbarActions;
} & Pick<SceneCamera, 'navigating' | 'opening'> &
  Pick<SceneNavigation, 'drillIn'> &
  Pick<SceneClipboard, 'copy' | 'cut' | 'paste'> &
  Pick<
    PointerMachine,
    | 'onBackgroundPointerDown'
    | 'onPointerMove'
    | 'onPointerUp'
    | 'onContextMenu'
    | 'cancelDrag'
    | 'updateHover'
    | 'onHandlePointerDown'
    | 'onPortPointerDown'
    | 'onEndPointerDown'
    | 'onPointPointerDown'
    | 'onMidpointPointerDown'
    | 'onPointContextMenu'
    | 'setTool'
    | 'removePoint'
    | 'menu'
    | 'closeMenu'
    | 'menuAnchorRef'
  > & {
    onDoubleClick: (event: MouseEvent) => void;
    onKeyDown: (event: KeyboardEvent) => void;
    rootRef: RefObject<HTMLDivElement | null>;
  };

export const [SceneViewProvider, useSceneViewContext] = createContext<SceneViewContextValue>('SceneView.Root');
