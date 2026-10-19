//
// Copyright 2026 DXOS.org
//

import { type ReactNode } from 'react';

import type * as Util from '@dxos/react-ui/Util';

import {
  type CanvasAtoms,
  type FreehandProjectionOptions,
  type InspectorMode,
  type Projection,
} from '../../engine/index.ts';
import { type GeneratorCompiler, type GeneratorSource } from '../../generator/index.ts';
import { type SceneDisplay } from '../../hooks/index.ts';
import {
  type BackgroundGrid,
  type Bounds,
  type Camera,
  type LinkRegistry,
  type NodeRegistry,
  type Point,
  type ThemeRegistry,
  type ViewId,
  type ViewStore,
} from '../../model/index.ts';

export type CanvasRootProps = Util.ThemedClassName<{
  store: ViewStore;
  root: ViewId;
  nodes?: NodeRegistry;
  links?: LinkRegistry;
  /** Projection per scene; freehand (identity) by default. */
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /** A host-owned projection instead, shared with the host's panels (see `useViewProjection`). */
  projection?: Projection;
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
  /** Minor grid spacing in scene px; moves snap to it, creation and resizing to the major grid, `MAJOR_GRID_RATIO` times it. */
  grid?: number;
  /** Least gap between the scene's frame and each viewport edge when fitting, in major cells. */
  margin?: number;
  /**
   * Look, select and navigate only: no gesture or key reaches the model, and no handle or port is drawn,
   * whatever the projection would allow.
   */
  readonly?: boolean;
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
  /** Called when the theme bar picks a theme, or `undefined` to take the default; the picker shows only when given. */
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
  /** The generators the scene's generator nodes reference, by reference (ANIMATION.md §6.6). */
  generators?: Readonly<Record<string, GeneratorSource>>;
  /** Compiles a generator's source (`createEsbuildCompiler`); without it generator nodes draw nothing. */
  compileGenerator?: GeneratorCompiler;
  /** Starts the generator worker; without it generators run in the page. */
  createGeneratorWorker?: () => Worker;
  children?: ReactNode;
}>;
