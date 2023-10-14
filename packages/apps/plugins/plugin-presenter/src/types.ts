//
// Copyright 2023 DXOS.org
//

import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';

export const PRESENTER_PLUGIN = 'dxos.org/plugin/presenter';

export type PresenterPluginProvides = IntentProvides & TranslationsProvides;
