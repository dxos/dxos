//
// Copyright 2025 DXOS.org
//

import { Doc, FormBuilder } from '@dxos/cli-util';
import { Connection } from '@dxos/link';
import { OAuthProvider } from '@dxos/protocols';

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
    provider: OAuthProvider.CLOUDFLARE,
    source: 'cloudflare.com',
    label: 'Cloudflare',
    // Kept in step by hand with `CLOUDFLARE_OAUTH_SCOPES` in plugin-cloudflare, which is canonical
    // and explains the set. This file cannot import it: providers depend on plugin-connector, so
    // reading their constants from here would close the cycle. Scope ids come from Cloudflare's
    // `GET /oauth/scopes`, not from wrangler's colon-delimited namespace.
    scopes: [
      'memberships.read',
      'account-settings.read',
      'user-details.read',
      'workers-scripts.write',
      'workers-scripts.bind',
      'workers-routes.write',
      'workers-tail.read',
      'workers-observability.read',
      'workers-kv-storage.write',
      'workers-r2.write',
      'workers-r2-bucket-item.write',
      'd1.write',
      'queues.write',
      'pipelines.write',
      'vectorize.write',
      'query-cache.write',
      'secrets-store.write',
      'ai.write',
      'containers.write',
      'zone.read',
      'ssl-and-certificates.write',
    ],
  },
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
      // `gmail.modify` (not `gmail.readonly`) — must stay within the scope set declared for
      // restricted-scope verification (DX-794); see plugin-google `src/scopes.ts`.
      'https://www.googleapis.com/auth/gmail.modify',
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
export const printConnection = (connection: Connection.Connection): Doc.Doc<any> => {
  return FormBuilder.make({ title: connection.name ?? connection.connectorId ?? connection.id }).pipe(
    FormBuilder.set('id', connection.id),
    FormBuilder.set('connectorId', connection.connectorId ?? ''),
    FormBuilder.build,
  );
};

/**
 * Pretty prints connection addition result with ANSI colors.
 */
export const printTokenAdded = (source: string): Doc.Doc<any> =>
  FormBuilder.make({ title: 'Connection added' }).pipe(FormBuilder.set('source', source), FormBuilder.build);

/**
 * Pretty prints connection removal result with ANSI colors.
 */
export const printConnectionRemoved = (name: string): Doc.Doc<any> =>
  FormBuilder.make({ title: 'Connection removed' }).pipe(FormBuilder.set('connection', name), FormBuilder.build);
