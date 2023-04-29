//
// Copyright 2023 DXOS.org
//

import { tailwindConfig, TailwindConfig } from '@dxos/aurora-theme';

// todo(thure): Why export the whole theme? Can this be done differently?
export const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;
