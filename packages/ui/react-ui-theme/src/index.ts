//
// Copyright 2022 DXOS.org
//

import { tailwindConfig, type TailwindConfig } from './config';

const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

export * from './styles';
export * from './types';
export * from './util';

// TODO(burdon): Replace need for access with CSS vars.
export { tokens };
