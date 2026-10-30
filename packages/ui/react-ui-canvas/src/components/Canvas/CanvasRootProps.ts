//
// Copyright 2026 DXOS.org
//

import { type ReactNode } from 'react';

import { type ModuleCompiler, type Timeline } from '@dxos/animation';
import type * as Util from '@dxos/react-ui/Util';
import { type Bounds, type Point, type ViewId } from '@dxos/scene';

import {
  type CanvasAtoms,
  type CanvasHistory,
  type CreateHistory,
  type FreehandProjectionOptions,
  type InspectorMode,
  type Projection,
} from '../../engine/index.ts';
import { type GeneratorSource } from '../../generator/index.ts';
import { type SceneDisplay } from '../../hooks/index.ts';
import {
  type BackgroundGrid,
  type Camera,
  type KeyAction,
  type LinkRegistry,
  type NodeRegistry,
  type ThemeRegistry,
  type ViewStore,
} from '../../model/index.ts';

export type CanvasRootProps = Util.ThemedClassName<{
  store: ViewStore;
  root: ViewId;
  nodes?: NodeRegistry;
  links?: LinkRegistry;
  /** Projection per scene; freehand (identity) by default. */
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /** A host-owned projection instead, shared with the host's panels (see `useViewProjection`); its edits are not undone. */
  projection?: Projection;
  /**
   * The undo history (VIEWS.md §8): how to make one over the canvas's own atoms (a host with its own history, such as
   * Composer's tracker), or one from `useCanvasHistory` that a host sharing `projection` with its panels shares too; by
   * default the canvas keeps a local one, so undo and redo work standalone.
   */
  history?: CanvasHistory | CreateHistory;
  /** Externally owned view state, e.g. to drive two views or persist the camera. */
  atoms?: CanvasAtoms;
  /** Where the camera starts on the root scene, e.g. as last left; the scene is fitted when unset. */
  initialCamera?: Camera;
  /** Called once the camera settles on the root scene, so a host can persist it. */
  onCameraChange?: (camera: Camera) => void;
  /**
   * The display toggles as last left; each is on when unset. With fit on, `initialCamera` is not restored: the view
   * opens fitted.
   */
  initialDisplay?: Partial<SceneDisplay>;
  /** Called when a display toggle changes, so a host can persist it. */
  onDisplayChange?: (display: SceneDisplay) => void;
  /** Minor grid spacing in scene px; moves, resizes and creation snap to the major grid, `MAJOR_GRID_RATIO` times it. */
  grid?: number;
  /** Least gap between the scene's frame and each viewport edge when fitting, in major cells. */
  margin?: number;
  /** Highest zoom a fit reaches: 1:1 by default, so a small scene is not magnified; a slide raises it to fill its box. */
  fitZoom?: number;
  /**
   * Look, select and navigate only: no gesture or key reaches the model, and no handle or port is drawn,
   * whatever the projection would allow.
   */
  readonly?: boolean;
  /** Draws no surface under the scene, so what is behind the canvas (e.g. a slide) shows through. */
  transparent?: boolean;
  /**
   * Shortcuts the host handles itself (e.g. a shared editor's undo and clipboard): the view leaves their keys to it
   * rather than acting on its own store.
   */
  hostKeys?: ReadonlySet<KeyAction>;
  /** Opens the host's context menu in place of the view's own, at a point in the view, over an element or the canvas. */
  onContextMenu?: (at: Point, kind: 'element' | 'canvas') => void;
  /** Called when the palette's read-only toggle is pressed; the toggle shows only when given, as the host owns `readonly`. */
  onReadonlyChange?: (readonly: boolean) => void;
  /** Where the inspectors (properties, layers, about) sit: floating over the canvas (the default), or docked in a column beside it. */
  inspectors?: InspectorMode;
  /**
   * Called when the dock is closed or an inspector's menu docks or floats them; the dock's close button and the menu
   * item show only when given, as the host owns `inspectors`.
   */
  onInspectorsChange?: (mode: InspectorMode) => void;
  /** The themes offered, and the style sets and backgrounds they name; the built-ins by default. */
  themes?: ThemeRegistry;
  /**
   * Changing it asks fit mode to animate to the scene's frame as it now stands: an edit never refits by itself, so a
   * host that grows or reveals content on purpose says so with a new value.
   */
  refitKey?: string | number;
  /** Milliseconds a refit asked for by `refitKey` takes, so it can keep time with the host's own reveal. */
  refitDuration?: number;
  /**
   * While set, the view travels across the scene at this velocity (scene units per second, positive rightward and
   * downward), taking the camera out of fit mode: a slow pan a host can start and stop, as in a presentation.
   */
  drift?: Point;
  /** Called with the stretch of the scene in view (scene coordinates) whenever the camera or the view's size changes. */
  onViewChange?: (view: Bounds) => void;
  /** The theme chosen for this drawing, over `defaultTheme`; the theme bar picks it. */
  theme?: string;
  /** The theme drawn when `theme` is unset; flat when this is unset too or unknown. */
  defaultTheme?: string;
  /** Overrides the theme's style set. */
  styleSet?: string;
  /** Overrides the theme's background. */
  background?: string;
  /** Overrides the background's grid; the theme bar picks it. */
  backgroundGrid?: BackgroundGrid;
  /**
   * Called when the theme bar picks a theme, or `undefined` to take the default. Unset, a pick holds for this view
   * alone: the picker works whether or not the host stores the choice.
   */
  onThemeChange?: (theme: string | undefined) => void;
  /** Called when the theme bar picks a grid, or `undefined` to take the background's own. */
  onBackgroundGridChange?: (grid: BackgroundGrid | undefined) => void;
  /** What Fit frames instead of the scene's shapes, e.g. a film's frame; the inset still applies. */
  frame?: Bounds;
  /**
   * Publishes the view's clock for a frame renderer (`scripts/render-story.mjs`), which seeks it frame by frame and waits
   * on `data-frame-time` (ANIMATION.md §7.2).
   */
  exportable?: boolean;
  /**
   * The timeline that animates the scenes, held by the host (an animator shot, plugin-animator F-2.3): a View stores
   * none. Unset, nothing is animated.
   */
  timeline?: Timeline;
  /** Takes the timeline with the keys an edit or a time command made; absent, the timeline is only played. */
  onTimelineChange?: (timeline: Timeline) => void;
  /** The generators the scene's generator nodes reference, by reference (ANIMATION.md §6.6). */
  generators?: Readonly<Record<string, GeneratorSource>>;
  /** Compiles a generator's source (`createEsbuildCompiler`); without it generator nodes draw nothing. */
  compileGenerator?: ModuleCompiler;
  /** Starts the generator worker; without it generators run in the page. */
  createGeneratorWorker?: () => Worker;
  children?: ReactNode;
}>;
