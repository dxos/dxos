//
// Copyright 2026 DXOS.org
//

// NOTE: tools/ must NOT import from ../components/ (dependency flows: components -> tools).
// Run `grep -r "from '../../components\|from '../components" src/tools/` to verify.

import { AddObjectAction, DeleteObjectsAction, JoinObjectsAction, SubtractObjectsAction } from './actions/index.ts';
import { ToolManager } from './tool-manager.ts';
import { ExtrudeTool, MoveTool, SelectTool } from './tools/index.ts';

export { DEFAULT_EDITOR_STATE, type EditorState } from './editor-state.ts';
export type { Tool } from './tool.ts';
export type {
  FaceSelection,
  MultiObjectSelection,
  ObjectSelection,
  Selection,
  SelectionMode,
  SelectionState,
  ToolContext,
} from './tool-context.ts';
export { getSelectedObjectIds } from './tool-context.ts';
export { ToolManager } from './tool-manager.ts';

/** Creates a fully configured ToolManager with all tools and actions registered. */
export const createToolManager = (): ToolManager =>
  new ToolManager()
    .registerTool(new SelectTool())
    .registerTool(new MoveTool())
    .registerTool(new ExtrudeTool())
    .registerAction(new AddObjectAction())
    .registerAction(new DeleteObjectsAction())
    .registerAction(new JoinObjectsAction())
    .registerAction(new SubtractObjectsAction());
