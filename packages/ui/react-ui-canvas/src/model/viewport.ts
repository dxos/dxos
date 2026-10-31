//
// Copyright 2026 DXOS.org
//

import { type ReactNode } from 'react';

import { type LayoutIntent, type ModelIntent, type Scene } from '@dxos/scene';

//
// The viewport contract: what a dimension's viewport draws and how it reports gestures. The engine and the 3D renderer
// implement it, so it lives with them; the editor's dimension config names a viewport of this shape.
//

type Point = { x: number; y: number };

/** The tool in hand: its id, and for `place` the model object it places. */
export type ActiveTool = { id: string; object?: string };

/** A selected face: the element and the outward normal of the side picked (3D; 2D never sets one). */
export type FaceSelection = { element: string; normal: { x: number; y: number; z: number } };

/**
 * What the dimension's viewport draws and how it reports gestures: every edit is an intent (a drag's in-flight state a
 * preview, written once on release), so the editor core records, undoes and shares them the same way in 2D and 3D.
 */
export type ViewportProps<C = unknown> = {
  document: Scene.SceneDocument;
  scene: string;
  /** The open layout; the scene's own when undefined. */
  editing?: string;
  selection: readonly string[];
  tool: ActiveTool;
  readonly: boolean;
  /** Drawn as a picture (a card, section or slide): the authored view, no gestures, grid or chrome. */
  picture?: boolean;
  /** The grid drawn, and snapping (both follow the display panel). */
  grid: boolean;
  snap: boolean;
  /** The axes through the origin drawn. */
  axes?: boolean;
  /** 2D's guides: on a lattice, its cells. */
  guides?: boolean;
  /** The look's id (a default style catalog). */
  theme: string;
  face?: FaceSelection;
  camera?: C;
  onSelect: (ids: string[]) => void;
  /** The viewport changed the tool itself (a create tool giving way to select once it has made its element). */
  onToolChange?: (tool: ActiveTool) => void;
  onIntent: (layout: string, intent: LayoutIntent) => void;
  /** Writes a model edit (an object a new composite places); returns its problems. */
  onModelIntent?: (intent: ModelIntent) => readonly string[];
  /** Runs `change`, recording the intents it writes as one undo step (a new portal: its element, scene and object). */
  onTransaction?: (change: () => void) => void;
  onPreview: (layout: string | undefined, intent?: LayoutIntent) => void;
  /** Opens a layout (a double-clicked composite); undefined goes back to the scene's own. */
  onEdit: (layout: string | undefined) => void;
  onContextMenu: (at: Point, kind: 'element' | 'canvas') => void;
  onFaceChange?: (face: FaceSelection | undefined) => void;
  onCameraChange?: (camera: C) => void;
  onResize?: (size: { width: number; height: number }) => void;
  /** The floating panels, drawn over the scene. */
  children?: ReactNode;
};

/** What a mode sees of the editor when it constrains an edit. */
export type ConstrainContext = { snap: boolean };

/**
 * A layout mode's rule: `intent` rewritten so `layout` keeps the mode (snapped onto a lattice, re-placed by a solver),
 * or undefined when the mode refuses it.
 */
export type ConstrainIntent = (
  layout: Scene.LayoutRecord,
  intent: LayoutIntent,
  context: ConstrainContext,
) => LayoutIntent | undefined;
