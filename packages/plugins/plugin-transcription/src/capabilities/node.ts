//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { TranscriptionEvents } from '#types';

// The capabilities `TranscriptionPlugin.node` activates, and only those. A lazy module defers its
// import at runtime but a bundler still walks it, so listing the React surfaces here would pull the
// plugin's components into every node and bun build.

export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const TextContent = AppCapability.textContent(() => import('./text-content'), {
  activatesOn: TranscriptionEvents.Start,
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
