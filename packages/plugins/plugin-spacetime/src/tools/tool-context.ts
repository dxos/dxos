//
// Copyright 2026 DXOS.org
//

import { type ArcRotateCamera, type HighlightLayer, type Mesh, type Scene as BabylonScene } from '@babylonjs/core';
import type { Manifold } from 'manifold-3d';

import { type getManifold } from '../engine';
import { type Scene, type Model } from '#types';

import { type EditorState } from './editor-state';

/** Selection granularity mode. */
export type SelectionMode = 'object' | 'face';

/** Toolbar-facing selection state (derived from EditorState). */
export type SelectionState = {
  selectionMode: SelectionMode;
  selectionCount: number;
};

/** Base selection fields shared by all selection types. */
type SelectionBase = {
  /** ECHO object id of the selected mesh. */
  objectId: string;
  /** Babylon mesh that is selected. */
  mesh: Mesh;
  /** Babylon overlay mesh for the selection highlight. */
  highlightMesh: Mesh | null;
};

/** Single-face selection. */
export type FaceSelection = SelectionBase & {
  type: 'face';
  /** Selected face index. */
  faceId: number;
  /** Outward normal of the selected face. */
  normal: { x: number; y: number; z: number };
};

/** Whole-object selection. */
export type ObjectSelection = SelectionBase & {
  type: 'object';
};

/** Multi-object selection (ordered list, first = primary). */
export type MultiObjectSelection = {
  type: 'multi-object';
  /** Ordered list of selected objects (first = primary). */
  objects: Array<{ objectId: string; mesh: Mesh }>;
};

/** Shared selection state that persists across tool switches. */
export type Selection = FaceSelection | ObjectSelection | MultiObjectSelection;

/** Shared context provided to all tools. */
export type ToolContext = {
  /** Manifold WASM module for CSG operations. */
  manifold: Awaited<ReturnType<typeof getManifold>>;
  /** Babylon.js scene for visual manipulation. */
  scene: BabylonScene;
  /** Camera for controlling orbit during tool interactions. */
  camera: ArcRotateCamera;
  /** Canvas element for pointer coordinate mapping. */
  canvas: HTMLCanvasElement;
  /** ECHO scene for committing changes after tool actions complete. */
  echoScene?: Scene.Scene;
  /** Map of ECHO object id to Babylon mesh. */
  meshes: Map<string, Mesh>;
  /** Resolve an ECHO object id to its Model.Object. */
  getObject: (id: string) => Model.Object | undefined;
  /** Unified editor state shared with tools, actions, canvas, and toolbar. */
  editorState: EditorState;
  /** Runtime Manifold solids keyed by object id. Persists across tool operations. */
  solids: Map<string, Manifold>;
  /** Scene-level highlight layer for object selection glow. */
  highlightLayer: HighlightLayer;
  /** Shared selection state. Tools read/write this to share face selection. */
  selection: Selection | null;
  /** Update the shared selection. Disposes old highlight and manages highlight layer. */
  setSelection: (selection: Selection | null) => void;
  /** Report debug stats for the canvas overlay. */
  setDebugStats: (stats: Record<string, string | number>) => void;
};

/** Returns all selected object IDs from any selection type. */
export const getSelectedObjectIds = (selection: Selection | null): string[] => {
  if (!selection) {
    return [];
  }
  if (selection.type === 'multi-object') {
    return selection.objects.map((entry) => entry.objectId);
  }
  return [selection.objectId];
};
