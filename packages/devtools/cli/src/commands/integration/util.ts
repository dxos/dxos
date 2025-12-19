//
// Copyright 2025 DXOS.org
//

import { OAuthProvider } from '@dxos/protocols';
import { type AccessToken } from '@dxos/types';

import { FormBuilder } from '../../util';

export type OAuthPreset = {
  label: string;
  note: string; // TODO(burdon): Description?
  source: string;
  provider: OAuthProvider;
  scopes: string[];
};

// TODO(wittjosiah): Copied from plugin-token-manager.
export const OAUTH_PRESETS: OAuthPreset[] = [
  {
    label: 'Google',
    note: 'Email & calendar  read access.',
    source: 'google.com',
    provider: OAuthProvider.GOOGLE,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.readonly'],
  },
];

/**
 * Pretty prints a token for display using FormBuilder (shows id, source, note - NO token value).
 */
export const printToken = (token: AccessToken.AccessToken) => {
  return FormBuilder.of({ title: token.note || token.source })
    .set({ key: 'id', value: token.id })
    .set({ key: 'source', value: token.source })
    .set({ key: 'note', value: token.note || '<no note>' })
    .build();
};

/**
 * Pretty prints token addition result with ANSI colors.
 */
export const printTokenAdded = (source: string) =>
  FormBuilder.of({ title: 'Token added' }).set({ key: 'source', value: source }).build();

/**
 * Pretty prints token removal result with ANSI colors.
 */
export const printTokenRemoved = (source: string) =>
  FormBuilder.of({ title: 'Token removed' }).set({ key: 'source', value: source }).build();
