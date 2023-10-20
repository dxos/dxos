//
// Copyright 2023 DXOS.org
//

import { tailwindConfig, type TailwindConfig } from '@dxos/react-ui-theme';

// TODO(thure): Why export the whole theme? Can this be done differently?
export const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;
