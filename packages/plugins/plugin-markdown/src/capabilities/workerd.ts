//
// Copyright 2026 DXOS.org
//

// GENERATED-STYLE headless barrel (spike): the subset of `./index.ts` flagged for workerd, with
// excluded modules stubbed as `undefined` so the single canonical plugin entry can list every
// module and `Plugin.addModule` skips the stubs. Declared rather than re-exported from
// `./index.ts` because a bundler follows the dynamic import behind a lazy capability — importing
// the browser barrel at all pulls React surfaces into a worker bundle that cannot load them.

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const Schema = AppCapability.schema(() => import('./schema'));

export const AnchorResolver = undefined;
export const AnchorSort = undefined;
export const CommentConfig = undefined;
export const CreateObject = undefined;
export const MarkdownSettings = undefined;
export const MarkdownState = undefined;
export const ReactSurface = undefined;
export const Translations = undefined;
export const UndoMappings = undefined;
