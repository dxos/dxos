//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { PresenterCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const PresenterSettings = AppCapability.settings(() => import('./settings'), {
  provides: [PresenterCapabilities.Settings],
  activatesOn: ActivationEvents.DeferredStartup,
});
