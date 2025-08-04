//
// Copyright 2022 DXOS.org
//

import { type TailwindConfig, tailwindConfig } from './config';

export * from './styles';
export type * from './types';
export * from './util';

export { userDefaultTokenSet, hues } from './config/tokens';
export { tokens };

const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;
