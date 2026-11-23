//
// Copyright 2026 DXOS.org
//

import { translations as boardTranslations } from '@dxos/react-ui-board/translations';

import { translations as pluginTranslations } from '#translations';

/** Every translation bundle the plugin contributes, combined for one module body. */
export const translations = [...pluginTranslations, ...boardTranslations];
