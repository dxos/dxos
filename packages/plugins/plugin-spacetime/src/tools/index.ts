//
// Copyright 2026 DXOS.org
//

import { ToolManager } from './tool-manager';
import { SelectTool, MoveTool, ExtrudeTool } from './tools';
import { AddObjectAction, DeleteObjectsAction, JoinObjectsAction, SubtractObjectsAction } from './actions';

export type { EditorState, ActionResult } from './action';
export type { Tool } from './tool';
export type {
  ToolContext,
  Selection,
  ObjectSelection,
  FaceSelection,
  MultiObjectSelection,
  SelectionMode,
  SelectionState,
} from './tool-context';
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
