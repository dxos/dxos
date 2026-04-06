//
// Copyright 2026 DXOS.org
//

import { type Model } from '../types';

import { type Selection, type SelectionMode } from './tool-context';

/** Unified editor state shared between tools, actions, canvas, and toolbar. */
export type EditorState = {
  /** Active tool. */
  tool: string;
  /** Selection granularity mode. */
  selectionMode: SelectionMode;
  /** Show ground grid. */
  showGrid: boolean;
  /** Show debug panel. */
  showDebug: boolean;
  /** Current hue for new objects and selected object color. */
  hue: string;
  /** Currently selected template for new objects. */
  template: Model.ObjectTemplate;
  /** Canvas-level selection (includes Babylon mesh references). */
  selection: Selection | null;
  /** Object IDs to select after next canvas sync (set by actions, cleared by canvas). */
  pendingSelection: string[] | null;
};

/** Default editor state. */
export const DEFAULT_EDITOR_STATE: EditorState = {
  tool: 'select',
  selectionMode: 'object',
  showGrid: true,
  showDebug: false,
  hue: 'blue',
  template: 'cube',
  selection: null,
  pendingSelection: null,
};
