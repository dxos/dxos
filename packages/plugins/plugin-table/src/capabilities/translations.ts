//
// Copyright 2026 DXOS.org
//

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as tableTranslations } from '@dxos/react-ui-table/translations';

import { translations as pluginTranslations } from '#translations';

/** Every translation bundle the plugin contributes, combined for one module body. */
export const translations = [...pluginTranslations, ...formTranslations, ...tableTranslations];
