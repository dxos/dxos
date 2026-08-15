//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Server-safe `#capabilities` barrel: only the modules flagged for workerd. Declared here
// rather than re-exported from `./index.ts`, because that barrel also declares `ReactSurface`, and
// a bundler follows the dynamic import behind a lazy capability — so importing it at all pulls the
// React surface into a worker bundle that cannot load it. Excluded modules are stubbed as
// `undefined` so the canonical plugin entry can list every module and `Plugin.addModule` skips
// the stubs.

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const Schema = AppCapability.schema(() => import('../schema.workerd'));

export const AppGraphBuilder = undefined;
export const Commands = undefined;
export const CreateObject = undefined;
export const IdentityCreated = undefined;
export const NavigationHandler = undefined;
export const NavigationTargetResolver = undefined;
export const PluginAsset = undefined;
export const ReactRoot = undefined;
export const ReactSurface = undefined;
export const Repair = undefined;
export const SpaceSettings = undefined;
export const SpacesReady = undefined;
export const SpaceState = undefined;
export const Translations = undefined;
export const UndoMappings = undefined;
