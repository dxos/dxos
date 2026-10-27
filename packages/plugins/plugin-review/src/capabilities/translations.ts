//
// Copyright 2026 DXOS.org
//

import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';

import { translations as pluginTranslations } from '#translations';

/** Every translation bundle the plugin contributes, combined for one module body. */
export const translations = [...pluginTranslations, ...threadTranslations];
