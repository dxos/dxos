//
// Copyright 2025 DXOS.org
//

import { translations as assistantTranslations } from '@dxos/plugin-assistant/translations';
import { translations as debugTranslations } from '@dxos/react-ui-debug/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

/**
 * Shared decorators/parameters for the assistant module-container story groups. Each group file
 * inlines its own `title` (an object-literal default export, as required by the CSF indexer) and
 * references these for the common storybook setup.
 */
export const storyDecorators = [
  withTheme(),
  withLayout({
    layout: 'fullscreen',
  }),
];

export const storyParameters = {
  layout: 'fullscreen',
  translations: [...assistantTranslations, ...debugTranslations],
};
