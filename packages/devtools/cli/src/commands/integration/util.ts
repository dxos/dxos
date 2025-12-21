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
  return FormBuilder.make({ title: token.note || token.source }).pipe(
    FormBuilder.set('id', token.id),
    FormBuilder.set('source', token.source),
    FormBuilder.set('note', token.note || '<no note>'),
    FormBuilder.build
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
