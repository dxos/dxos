//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '@dxos/cli-util';
import { OAuthProvider } from '@dxos/protocols';
import { type AccessToken } from '@dxos/types';

export type OAuthPreset = {
  provider: OAuthProvider;
  source: string;
  label: string;
  scopes: string[];
};

// TODO(wittjosiah): Copied from plugin-token-manager.
export const OAUTH_PRESETS: OAuthPreset[] = [
  {
    provider: OAuthProvider.GITHUB,
    source: 'github.com',
    label: 'GitHub',
    scopes: ['repo', 'read:user'],
  },
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
  {
    provider: OAuthProvider.LINEAR,
    source: 'linear.app',
    label: 'Linear',
    scopes: ['write'],
  },
  {
    provider: OAuthProvider.SLACK,
    source: 'slack.com',
    label: 'Slack',
    scopes: ['channels:read', 'chat:write', 'users:read'],
  },
  {
    provider: OAuthProvider.TRELLO,
    source: 'trello.com',
    label: 'Trello',
    scopes: ['read', 'write'],
  },
];

/**
 * Pretty prints a token for display using FormBuilder (shows id, source - NO token value).
 */
export const printToken = (token: AccessToken.AccessToken) => {
  return FormBuilder.make({ title: token.account || token.source }).pipe(
    FormBuilder.set('id', token.id),
    FormBuilder.set('source', token.source),
    FormBuilder.build,
  );
};

/**
 * Pretty prints token addition result with ANSI colors.
 */
export const printTokenAdded = (source: string) =>
  FormBuilder.make({ title: 'Token added' }).pipe(FormBuilder.set('source', source), FormBuilder.build);

/**
 * Pretty prints token removal result with ANSI colors.
 */
export const printTokenRemoved = (source: string) =>
  FormBuilder.make({ title: 'Token removed' }).pipe(FormBuilder.set('source', source), FormBuilder.build);
