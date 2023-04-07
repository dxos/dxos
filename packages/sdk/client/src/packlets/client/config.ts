//
// Copyright 2022 DXOS.org
//

import { ConfigProto } from '@dxos/config';

export const DEFAULT_CLIENT_CHANNEL = 'dxos:app';
export const DEFAULT_SHELL_CHANNEL = 'dxos:shell';

export const DEFAULT_CLIENT_ORIGIN =
  process.env.NODE_ENV === 'production' ? 'https://halo.dxos.org/vault.html' : 'http://localhost:3967/vault.html';

export const EXPECTED_CONFIG_VERSION = 1;

export const defaultConfig: ConfigProto = { version: 1 };
