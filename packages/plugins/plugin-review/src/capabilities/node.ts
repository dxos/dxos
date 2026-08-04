//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import * as ReviewCapabilities from '../types/ReviewCapabilities';
import * as ReviewEvents from '../types/ReviewEvents';

// The capabilities `ReviewPlugin.node` activates, and only those. A lazy module defers its import at
// runtime but a bundler still walks it, so listing the React surfaces here would pull the plugin's
// components into every node and bun build.

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const HistoryGraph = AppCapability.appGraphBuilder(() => import('./history-graph'), {
  name: 'HistoryGraph',
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReviewState = Capability.lazyModule(
  'ReviewState',
  { provides: [ReviewCapabilities.ReviewRenderPolicy], activatesOn: ReviewEvents.Start },
  () => import('./review-state'),
);
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'), {
  activatesOn: ReviewEvents.Start,
});
