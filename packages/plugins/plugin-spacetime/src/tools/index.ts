//
// Copyright 2026 DXOS.org
//

// NOTE: tools/ must NOT import from ../components/ (dependency flows: components -> tools).
// Run `grep -r "from '../../components\|from '../components" src/tools/` to verify.

import { AddObjectAction, DeleteObjectsAction, JoinObjectsAction, SubtractObjectsAction } from './actions';
import { ToolManager } from './tool-manager';
import { ExtrudeTool, MoveTool, SelectTool } from './tools';

export { DEFAULT_EDITOR_STATE, type EditorState } from './editor-state';
export type { Tool } from './tool';
export type {
  FaceSelection,
  MultiObjectSelection,
  ObjectSelection,
  Selection,
  SelectionMode,
  SelectionState,
  ToolContext,
} from './tool-context';
export { getSelectedObjectIds } from './tool-context';
export { ToolManager } from './tool-manager';

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
