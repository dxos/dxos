//
// Copyright 2025 DXOS.org
//

import { OAuthProvider } from '@dxos/protocols';

export type OAuthPreset = {
  label: string;
  source: string;
  provider: OAuthProvider;
  scopes: string[];
  note?: string;
};

export const OAUTH_PRESETS: OAuthPreset[] = [
  {
    provider: OAuthProvider.GOOGLE,
    source: 'google.com',
    label: 'Google',
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ],
  },
];
