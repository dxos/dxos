//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

// The capabilities `SheetPlugin.node` activates, and only those. A lazy module defers its import at
// runtime but a bundler still walks it, so listing the React surfaces here would pull the plugin's
// components into every node and bun build.

export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'));
