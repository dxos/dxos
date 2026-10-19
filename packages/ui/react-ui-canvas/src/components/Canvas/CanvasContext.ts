//
// Copyright 2026 DXOS.org
//

import { type KeyboardEvent, type MouseEvent, type RefObject } from 'react';

import { createContext } from '@dxos/react-hooks';

import {
  type CanvasAtoms,
  type ControlPointRef,
  type Drag,
  type EditingPart,
  type InspectorMode,
  type Isolation,
  type Projection,
} from '../../engine/index.ts';
import { type GeneratorFrames } from '../../generator/index.ts';
import { type useRegistry } from '../../hooks/index.ts';
import {
  type BackgroundGrid,
  type Bounds,
  type Camera,
  type Capabilities,
  type ElementId,
  type LinkId,
  type LinkRegistry,
  type NodeId,
  type NodeRegistry,
  type Scene,
  type SceneId,
  type SceneLook,
  type SceneStore,
  type ThemeRegistry,
  type Timeline,
  type Tool,
} from '../../model/index.ts';
import { type Clipboard } from '../../utils/index.ts';
import { type ElementHandlers } from '../SceneLayer/index.ts';
import { type ToolbarActions } from '../Toolbar/index.ts';
import { type PointerMachine } from './usePointerMachine.ts';
import { type SceneCamera } from './useSceneCamera.ts';
import { type SceneClipboard } from './useSceneClipboard.ts';
import { type SceneNavigation } from './useSceneNavigation.ts';

/**
 * What `Canvas.Root` composes and every part reads. The parts are a view onto one machine rather than
 * components with state of their own, so the whole of it is here rather than threaded part by part: a
 * toolbar and the canvas act on the same camera, the same selection and the same projection.
 */
/** What the timeline keys (space, `,` `.`, `[` `]`, `K`) do; inactive while the scene has no timeline. */
export type TimelineKeys = {
  active: boolean;
  togglePlay: () => void;
  /** Moves the playhead by whole frames. */
  step: (frames: number) => void;
  /** Moves the playhead to the selection's next or previous key. */
  jumpKey: (direction: 1 | -1) => void;
  addKey: () => void;
  /** Removes the selection's keys at the playhead. */
  removeKey: () => void;
};

/** The composite-object actions (ANIMATION.md §4.2); each is one undo step. */
export type ObjectActions = {
  compose: () => void;
  ungroup: (id: NodeId) => void;
  makeUnique: (id: NodeId) => void;
  duplicate: (composite: SceneId) => void;
  place: (composite: SceneId) => void;
  rename: (composite: SceneId, name: string) => void;
  remove: (composite: SceneId, instances: boolean) => void;
};

export type CanvasContextValue = {
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  store: SceneStore;
  projection: Projection;
  capabilities: Capabilities;
  /** The scene is only looked at: the parts that edit it (selection frame, ports, actions, properties) hide. */
  readonly: boolean;
  /** Toggles `readonly`; absent when the host does not offer the toggle. */
  onReadonlyChange?: (readonly: boolean) => void;
  nodeRegistry: NodeRegistry;
  linkRegistry: LinkRegistry;
  /** The theme, style set and background the view draws with. */
  look: SceneLook;
  themes: ThemeRegistry;
  /** The theme chosen for the drawing over the default, if any. */
  themeOverride?: string;
  /** The grid the theme's own background draws. */
  themeGrid: BackgroundGrid;
  onThemeChange?: (theme: string | undefined) => void;
  onBackgroundGridChange?: (grid: BackgroundGrid | undefined) => void;

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
  toggleGuides: () => void;
  /** On a lattice scene, snap lands on the lattice rather than the basic grid. */
  latticeOn: boolean;

  selection: ReadonlySet<ElementId>;
  hover: ElementId | undefined;
  selectedPoint: ControlPointRef | undefined;
  editing: EditingPart | undefined;
  /** The node whose embedded content takes input. */
  active: NodeId | undefined;
  clipboard: Clipboard | undefined;
  drag: Drag | undefined;
  tool: Tool;
  debug: boolean;
  /** Where the inspectors sit. */
  inspectors: InspectorMode;
  /** Docks or floats the inspectors; absent when the host does not offer the choice. */
  onInspectorsChange?: (mode: InspectorMode) => void;

  /** The bounds a create gesture would land, drawn whether or not the node itself previews. */
  createFrame: Bounds | undefined;
  /** Where the nodes of a move in flight will land, while they follow the pointer. */
  landing: readonly Bounds[] | undefined;
  handlers: ElementHandlers;
  /** The link under the pointer. */
  linkHover: LinkId | undefined;
  select: (ids: Iterable<ElementId>) => void;
  toolbarActions: ToolbarActions;

  /** The projection under the animated one: what keys and timeline edits are written through. */
  baseProjection: Projection;
  /** The current scene's timeline, as stored. */
  timeline: Timeline | undefined;
  /** The clock's time and state. */
  time: number;
  playing: boolean;
  fps: number;
  /** Pauses and moves the playhead. */
  seek: (t: number) => void;
  timelineKeys: TimelineKeys;
  /** Keys the current camera at the playhead. */
  keyCamera: () => void;
  isolation: Isolation | undefined;
  isolate: (composite: SceneId) => void;
  exitIsolation: () => void;
  objectActions: ObjectActions;
  /** What the scene's generators drew, and for which time. */
  generated: GeneratorFrames | undefined;
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

export const [CanvasProvider, useCanvasContext] = createContext<CanvasContextValue>('Canvas.Root');
