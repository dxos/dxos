//
// Copyright 2026 DXOS.org
//

import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as queryTranslations } from '@dxos/react-ui-query/translations';
import { translations as shellTranslations } from '@dxos/shell/translations';

import { translations as pluginTranslations } from '#translations';

/** Every translation bundle the plugin contributes, combined for one module body. */
export const translations = [
  ...pluginTranslations,
  ...componentsTranslations,
  ...queryTranslations,
  ...formTranslations,
  ...shellTranslations,
];
