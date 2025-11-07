//
// Copyright 2022 DXOS.org
//

import { type TailwindConfig, tailwindConfig } from './config';

export { cardMinInlineSize, cardMaxInlineSize, hues, userDefaultTokenSet } from './config';
export * from './styles';
export * from './types';
export * from './util';

const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

export { tokens };
