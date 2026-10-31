//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import { type ComponentType, type PropsWithChildren, type ReactNode } from 'react';

import {
  type ActiveTool,
  type BackgroundGrid,
  type CanvasShellProps,
  type ConstrainIntent,
  type FaceSelection,
  type ThemeMode,
  type ThemeRegistry,
} from '@dxos/react-ui-canvas';
import { type Fragment, type LayoutIntent, type ModelIntent, type Scene } from '@dxos/scene';

import { type InspectorSectionDef } from '../components/index.ts';
import { type EditorDocument, type EditorNavigation, type EditorSelection, type EditorTools } from './aspects/index.ts';
import { type MenuAnchor } from './store.ts';
import { type AnimatableFields } from './timeline.ts';

/** What a tool does, which decides its rail group and whether a locked editor keeps it. */
export type ToolCategory = 'select' | 'transform' | 'create';

/**
 * A tool on the rail. `kind` is the element type a create tool makes; `key` the shortcut that picks it; `group` names
 * its rail group when the category's own does not (2D's further node groups).
 */
export type ToolDef = {
  id: string;
  icon: string;
  label: string;
  category: ToolCategory;
  kind?: string;
  key?: string;
  group?: string;
  /** Adjacent tools of a group naming the same fold share one flyout button (e.g. the link types). */
  fold?: string;
};

/** Moving, measuring and snapping elements, in the dimension's units. */
export type GeometryOps = {
  /** How far the `pasted`th paste lands from its copy: a grid step along each ground axis per paste. */
  pasteOffset: (pasted: number) => { x: number; y: number; z?: number };
  /** The steps snapping moves, turns and scales by. */
  snap: { move: number; rotate?: number; scale?: number };
};

/** The camera bar's maths over the camera of a dimension whose viewport does not move its own (3D). */
export type CameraOps<C> = {
  /** The camera framing the open layout's elements in a viewport of `size`. */
  fit: (camera: C, document: Scene.SceneDocument, layout: string, size: { width: number; height: number }) => C;
  /** Actual size: the authored camera's scale and view, moved so the open layout's elements sit in the middle. */
  reset: (authored: C, document: Scene.SceneDocument, layout: string, size: { width: number; height: number }) => C;
  /** The camera `factor` closer (below 1) or further (above 1), about the centre of a viewport of `size`. */
  zoom: (camera: C, factor: number, size: { width: number; height: number }) => C;
  /** The zoom as a percentage of the authored camera's. */
  percent: (camera: C, authored: C) => number;
};

/** What the display panel offers: the looks (default style catalogs), grid kinds and the 2D-only guides. */
export type DisplayOptions = {
  /** Each look by id and name; with a `mode`, it holds that mode whatever the app's. */
  themes: readonly { id: string; label: string; mode?: ThemeMode }[];
  /** The looks as a theme registry, which the picker draws as swatches (2D's canvas themes). */
  registry?: ThemeRegistry;
  grids: readonly Exclude<BackgroundGrid, 'none'>[];
  guides: boolean;
};

/** What the Properties section gives its form: the one selected element, and where its edits go. */
export type PropertyFormProps = {
  element: Scene.Element2D | Scene.Element3D;
  readonly: boolean;
  onIntents: (intents: LayoutIntent[]) => void;
};

/** A dimension's own inspector section, stacked with the shared ones. */
export type SectionDef = { section: InspectorSectionDef; render: () => ReactNode };

/** A command only one dimension offers (3D join, subtract, import mesh, export STL). */
export type ExtraCommandDef = {
  /** `import` is offered by the Objects section's import button rather than the actions bar. */
  id: string;
  label: string;
  icon: string;
  enabled: (state: { selection: readonly string[]; readonly: boolean }) => boolean;
  run: (context: ExtraCommandContext) => void | Promise<void>;
};

/** What an extra command may do: read the open layout and selection, and edit through intents. */
export type ExtraCommandContext = {
  document: Scene.SceneDocument;
  layout: string;
  selection: readonly string[];
  onIntent: (layout: string, intent: LayoutIntent) => void;
  /** Writes a model edit as one undo step; returns its problems. */
  onModelIntent: (intent: ModelIntent) => readonly string[];
  select: (ids: readonly string[]) => void;
  setTool: (tool: ActiveTool) => void;
  notify: (message: string | undefined) => void;
};

/** The `.dx` text a copy writes and a paste reads, lifted or flattened into the dimension pasted into. */
export type ClipboardCodec = {
  write: (document: Scene.SceneDocument, layout: Scene.LayoutRecord, fragment: Fragment) => string;
  read: (text: string, dim: Scene.Dimension) => Fragment | undefined;
};

/** What the editor gives a dimension to build its aspects over: the document and the host's camera. */
export type DimensionContext<C> = {
  registry: Registry.AtomRegistry;
  document: EditorDocument;
  /** This viewer's camera as the host stores it, the scene's authored one, and where a settled camera is reported. */
  camera: { host: Atom.Atom<C | undefined>; authored: Atom.Atom<C | undefined>; report: (camera: C) => void };
  /** Shows a gesture's edit without writing it; undefined drops it. */
  preview: (layout: string | undefined, intent?: LayoutIntent) => void;
  setMenu: (menu: MenuAnchor | undefined) => void;
};

/**
 * A dimension's aspects for one editor (COMMON-CORE Expectation 0): the shared hooks read them, so each dimension
 * supplies its own navigation, selection and tools behind the same parts.
 */
export type Dimension = {
  navigation: EditorNavigation;
  selection: EditorSelection;
  tools: EditorTools;
  /**
   * Holds the dimension's engine round all the editor's parts, so each can read it; inside `Frame` (the inspector
   * panel's) while it edits.
   */
  Root: ComponentType<PropsWithChildren<{ Frame?: ComponentType<CanvasShellProps> }>>;
  /** The scene drawn, with the floating panels over it. */
  Viewport: ComponentType<PropsWithChildren>;
  /** False when the dimension's engine takes the chorded shortcuts itself, with its own undo and clipboard. */
  shortcuts?: boolean;
};

/**
 * Everything that differs between the 2D and 3D editors; the rest of `SceneEditor` (panels, inspectors, commands,
 * history, clipboard, lock, roles) is shared.
 */
export type DimensionConfig<C = unknown> = {
  dim: Scene.Dimension;
  /** Builds the dimension's aspects for one editor, once. */
  create: (context: DimensionContext<C>) => Dimension;
  tools: readonly ToolDef[];
  /** What dragging a rail tool onto the viewport drops (2D: a node of the tool's type); undefined, the tool does not drag. */
  toolDragData?: (tool: ToolDef) => Record<string, unknown> | undefined;
  geometry: GeometryOps;
  display: DisplayOptions;
  /** The form over one selected element; `createPropertyForm` builds it from a schema. */
  propertyForm: ComponentType<PropertyFormProps>;
  /** The form edits a whole selection (values the elements share, mixed where they differ), not only one element. */
  propertyFormSelection?: boolean;
  /** A line over the properties form (3D: the selected face). */
  propertyInfo?: (state: { face?: FaceSelection }) => ReactNode;
  sections?: readonly SectionDef[];
  /** The element fields the Timeline panel keys (`placementFields` when unset). */
  animatable?: AnimatableFields;
  commands?: readonly ExtraCommandDef[];
  /** The layout's mode, between every edit and its write (2D's lattice, dynamic). */
  constrain?: ConstrainIntent;
};
