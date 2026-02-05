//
// Copyright 2022 DXOS.org
//

import { type TailwindConfig, tailwindConfig } from './config';

export { cardDefaultInlineSize, cardMinInlineSize, cardMaxInlineSize, hues, userDefaultTokenSet } from './config';
export * from './styles';
export * from './types';
export * from './util';

const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

export { tokens };

/**
 * Translation namespace for OS-level translations.
 */
export const osTranslations = 'dxos.org/i18n/os';
