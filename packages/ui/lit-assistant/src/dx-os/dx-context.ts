//
// Copyright 2025 DXOS.org
//

import { createContext } from '@lit/context';

import { type Client } from '@dxos/client';
import { type Halo } from '@dxos/client-protocol';
import { type ThemeContextValue } from '@dxos/react-ui-types';

// TODO(thure): Consider moving all this to `lit-ui`.

export interface DxContext {
  theme: ThemeContextValue;
  client?: Client;
  halo?: Halo;
}

export const dxContext = createContext('dx-context');
