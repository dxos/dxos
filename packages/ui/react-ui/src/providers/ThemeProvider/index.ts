//
// Copyright 2022 DXOS.org
//

export { type Label, isLabel, toLocalizedString } from '@dxos/ui-types/translations';

export {
  type IconRegistry,
  type IconSource,
  extendedIconSource,
  getIconRegistry,
  phosphorIconSource,
  useIconRegistry,
} from './icon-registry';
export * from './IconRegistry';
export * from './ThemeProvider';
export { TranslationsContext, useTranslation } from './TranslationsContext';
