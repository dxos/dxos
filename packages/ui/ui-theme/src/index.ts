//
// Copyright 2022 DXOS.org
//

import { tailwindConfig } from './config';

// TODO(burdon): Factor out public vs. internals.
export { cardDefaultInlineSize, cardMinInlineSize, cardMaxInlineSize, hues, userDefaultTokenSet } from './config';
export * from './styles';
export * from './types';
export * from './util';

const { theme: tokens } = tailwindConfig({});

export { tokens };

/**
 * Translation namespace for OS-level translations.
 */
export const osTranslations = 'dxos.org/i18n/os';
