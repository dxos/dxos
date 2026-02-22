//
// Copyright 2023 DXOS.org
//

import { tailwindConfig, type TailwindConfig } from './config';

export default tailwindConfig({ content: ['./src/**/*.{ts,tsx}'] }) as TailwindConfig;
