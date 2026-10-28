//
// Copyright 2026 DXOS.org
//

import { type AccessToken } from '@dxos/link';

import { type LighthouseEndpoint } from '#client';

import { DEFAULT_SERVER_URL } from '../constants.ts';

/** The endpoint a lighthouse connection's credential names: the URL is its `account`, the API token its `token`. */
export const getEndpoint = (accessToken: Pick<AccessToken.AccessToken, 'account' | 'token'>): LighthouseEndpoint => ({
  url: accessToken.account || DEFAULT_SERVER_URL,
  token: accessToken.token,
});
