//
// Copyright 2025 DXOS.org
//

// GENERATED-STYLE headless barrel (spike): the subset of `./index.ts` flagged for node, with
// excluded modules stubbed as `undefined` so the single canonical plugin entry can list every
// module and `Plugin.addModule` skips the stubs.

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));

export const AnchorResolver = undefined;
export const AnchorSort = undefined;
export const CommentConfig = undefined;
export const MarkdownSettings = undefined;
export const MarkdownState = undefined;
export const ReactSurface = undefined;
export const Translations = undefined;
export const UndoMappings = undefined;
