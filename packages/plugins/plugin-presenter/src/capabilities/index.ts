//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown/types';

import { PresenterCapabilities, PresenterEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: PresenterEvents.Start,
});
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: PresenterEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: PresenterEvents.Start,
});
export const PresenterSettings = AppCapability.settings(() => import('./settings'), {
  provides: [PresenterCapabilities.Settings],
  activatesOn: PresenterEvents.Start,
});
