//
// Copyright 2026 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';
import { SpaceCapability } from '@dxos/plugin-space';

import { MapCapabilities } from '#types';

// The capabilities `MapPlugin.node` activates, and only those. A lazy module defers its import at
// runtime but a bundler still walks it, so listing `ReactSurface` here would pull the map
// components — and `@dxos/react-ui-geo`'s country geometry — into every node and bun build.

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [MapCapabilities.MarkerProvider],
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
