//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/token-manager',
  name: 'Tokens',
  description: trim`
    Secure credential management for API keys and authentication tokens.
    Store and manage access tokens for external integrations with encrypted storage.
  `,
};
