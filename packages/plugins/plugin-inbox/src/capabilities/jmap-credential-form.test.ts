//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Jmap } from '../apis';
import { JMAP_DEFAULT_HOST } from '../constants';
import { buildJmapCredential, jmapCredentialForm } from './jmap-credential-form';

const session = (username?: string): Jmap.Session => ({
  apiUrl: 'https://api.fastmail.com/jmap/api/',
  primaryAccounts: { 'urn:ietf:params:jmap:mail': 'u1' },
  username,
});

const connector = { id: 'jmap-mail', label: 'JMAP Mail' };

describe('jmapCredentialForm', () => {
  it('defaults the host to the Fastmail endpoint', ({ expect }) => {
    expect(jmapCredentialForm.defaultValues?.host).toBe(JMAP_DEFAULT_HOST);
  });

  it('builds an AccessToken + Connection from the form email', ({ expect }) => {
    const { accessToken, connection } = buildJmapCredential({
      host: 'mail.example.com',
      email: 'me@example.com',
      token: 'secret',
      session: session('login@example.com'),
      connector,
    });
    expect(accessToken.source).toBe('mail.example.com');
    expect(accessToken.account).toBe('me@example.com');
    expect(accessToken.token).toBe('secret');
    expect(connection.connectorId).toBe('jmap-mail');
    expect(connection.name).toBe('JMAP Mail');
    expect(connection.accessToken).toBeDefined();
  });

  it('falls back to the session username when the email is blank', ({ expect }) => {
    const { accessToken } = buildJmapCredential({
      host: 'api.fastmail.com',
      email: '',
      token: 'secret',
      session: session('login@fastmail.com'),
      connector,
    });
    expect(accessToken.account).toBe('login@fastmail.com');
  });

  it.effect(
    'onValidate rejects an empty token before any network call',
    Effect.fnUntraced(function* ({ expect }) {
      const { onValidate } = jmapCredentialForm;
      if (!onValidate) {
        throw new Error('expected an onValidate hook');
      }
      const error = yield* Effect.flip(
        onValidate({
          values: { host: JMAP_DEFAULT_HOST, email: 'me@example.com', token: '' },
          connector: { id: 'jmap', source: JMAP_DEFAULT_HOST },
        }),
      );
      expect(error).toBeInstanceOf(Error);
    }),
  );
});
