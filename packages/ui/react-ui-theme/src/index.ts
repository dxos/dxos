//
// Copyright 2022 DXOS.org
//

import { tailwindConfig, type TailwindConfig } from './config';

const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

export * from './styles';
export type * from './types';
export * from './util';

export { userDefaultTokenSet, hues } from './config/tokens';

export { tokens };
