//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { ObservabilityCapabilities, ObservabilityEvents } from './types';
// TODO(wittjosiah): FeedbackForm should be factored out of plugin-observability into a shared UI package.
export * from './meta';
export const ObservabilityPlugin = Plugin.lazy(meta, () => import('#plugin'));
export { translations as observabilityTranslations } from './translations';
