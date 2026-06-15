//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type AppCapabilities } from '@dxos/app-toolkit';
import type { OperationHandlerSet } from '@dxos/compute';
import { type AutomationCapabilities } from '@dxos/plugin-automation';

// The contributed capability type references `Template` from @dxos/plugin-automation, so the lazy
// wrapper needs an explicit annotation to keep the inferred type portable (TS2883).
export const AutomationTemplates: Capability.LazyCapability<
  void,
  Capability.Capability<typeof AutomationCapabilities.Template>[]
> = Capability.lazy('AutomationTemplates', () => import('./automation-templates'));

// The contributed capability type references Blueprint types from @dxos/compute, so the lazy
// wrapper needs an explicit annotation to keep the inferred type portable (TS2883).
export const BlueprintDefinition: Capability.LazyCapability<
  void,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]
> = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
