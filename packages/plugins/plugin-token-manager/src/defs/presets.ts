//
// Copyright 2025 DXOS.org
//

import { OAuthProvider } from '@dxos/protocols';

export type OAuthPreset = {
  label: string;
  note: string; // TODO(burdon): Description?
  source: string;
  provider: OAuthProvider;
  scopes: string[];
};

export const OAUTH_PRESETS: OAuthPreset[] = [
  {
    label: 'Gmail',
    note: 'Email read access.',
    source: 'gmail.com',
    provider: OAuthProvider.GOOGLE,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  },
];
