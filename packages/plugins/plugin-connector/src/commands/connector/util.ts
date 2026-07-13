//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '@dxos/cli-util';
import { OAuthProvider } from '@dxos/protocols';

import { type Connection } from '../../types';

/**
 * OAuth flow descriptor for the CLI `connector add` preset list. Mirrors the `oauth`
 * spec on a `Connector` capability entry plus a label/source for display.
 */
// TODO(wittjosiah): Replace this hard-coded list by resolving the registered `Connector`
//   capabilities (which already declare each service's provider/scopes) once the CLI can
//   access them.
export type OAuthPreset = {
  label: string;
  source: string;
  provider: OAuthProvider;
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
 * Pretty prints a connection for display using FormBuilder (id + connector — NO token value).
 */
export const printConnection = (connection: Connection.Connection) => {
  return FormBuilder.make({ title: connection.name ?? connection.connectorId ?? connection.id }).pipe(
    FormBuilder.set('id', connection.id),
    FormBuilder.set('connectorId', connection.connectorId ?? ''),
    FormBuilder.build,
  );
};

/**
 * Pretty prints connection addition result with ANSI colors.
 */
export const printTokenAdded = (source: string) =>
  FormBuilder.make({ title: 'Connection added' }).pipe(FormBuilder.set('source', source), FormBuilder.build);

/**
 * Pretty prints connection removal result with ANSI colors.
 */
export const printConnectionRemoved = (name: string) =>
  FormBuilder.make({ title: 'Connection removed' }).pipe(FormBuilder.set('connection', name), FormBuilder.build);
