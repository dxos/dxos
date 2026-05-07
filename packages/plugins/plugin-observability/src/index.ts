//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';
import { type ObservabilityPluginOptions } from './ObservabilityPlugin';

export { ObservabilityCapabilities, ObservabilityEvents } from './types';
// TODO(wittjosiah): FeedbackForm should be factored out of plugin-observability into a shared UI package.
export * from './meta';
export const ObservabilityPlugin = Plugin.lazy<ObservabilityPluginOptions>(meta, () => import('#plugin') as any);
export { translations as observabilityTranslations } from './translations';
