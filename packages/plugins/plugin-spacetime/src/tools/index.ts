//
// Copyright 2026 DXOS.org
//

// NOTE: tools/ must NOT import from ../components/ (dependency flows: components -> tools).
// Run `grep -r "from '../../components\|from '../components" src/tools/` to verify.

import { ToolManager } from './tool-manager';
import { SelectTool, MoveTool, ExtrudeTool } from './tools';
import { AddObjectAction, DeleteObjectsAction, JoinObjectsAction, SubtractObjectsAction } from './actions';

export { type EditorState, DEFAULT_EDITOR_STATE } from './editor-state';
export type { Tool } from './tool';
export type {
  ToolContext,
  Selection,
  ObjectSelection,
  FaceSelection,
  MultiObjectSelection,
  SelectionMode,
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
