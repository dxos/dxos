//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Obj, Ref } from '@dxos/echo';
import { Connection, type CredentialForm } from '@dxos/plugin-connector';
import { AccessToken } from '@dxos/types';

import { Jmap } from '../apis';
import { JMAP_DEFAULT_HOST } from '../constants';
import { JmapApiError } from '../errors';
import { JmapCredentials } from '../services';

/**
 * Manual-credential form for the JMAP connector. JMAP auth is a server-issued Bearer API token
 * (Fastmail: Settings → Privacy & Security → Integrations), outside any OAuth flow, so the host,
 * email, and token are collected directly.
 */
const JmapCredentialFormSchema = Schema.Struct({
  host: Schema.String.annotations({
    title: 'Server',
    description: 'JMAP server host. The session is discovered at https://<host>/.well-known/jmap.',
  }),
  email: Schema.String.annotations({
    title: 'Email',
    description: 'Your email address / username on the JMAP server.',
  }),
  token: Schema.String.annotations({
    title: 'API token',
    description: 'A JMAP API token, sent as a Bearer credential.',
  }),
});

type JmapCredentialFormValues = Schema.Schema.Type<typeof JmapCredentialFormSchema>;

export const jmapCredentialForm: CredentialForm<JmapCredentialFormValues> = {
  schema: JmapCredentialFormSchema,
  defaultValues: { host: JMAP_DEFAULT_HOST, email: '', token: '' },
  // Validate against the live session before the dialog closes so a wrong host/token fails inline
  // (with a clear 401 message) instead of creating a Connection that errors on every later sync.
  onValidate: ({ values }) =>
    Effect.gen(function* () {
      const host = values.host.trim();
      const token = values.token.trim();
      if (host.length === 0) {
        return yield* Effect.fail(new Error('Server host is required.'));
      }
      if (token.length === 0) {
        return yield* Effect.fail(new Error('API token is required.'));
      }
      yield* fetchSession(host, token);
    }),
  onSubmit: ({ values, connector }) =>
    Effect.gen(function* () {
      // Trim defensively: onValidate is optional and callers bypass it in tests.
      const host = values.host.trim();
      const email = values.email.trim();
      const token = values.token.trim();
      const session = yield* fetchSession(host, token);
      const { accessToken, connection } = buildJmapCredential({ host, email, token, session, connector });
      return { kind: 'complete' as const, accessToken, connection };
    }),
};

/**
 * Builds the `AccessToken` (source = host, account = form email or session username) and `Connection`
 * for a validated JMAP credential. Pure (no DB), so the construction is unit-testable.
 */
export const buildJmapCredential = ({
  host,
  email,
  token,
  session,
  connector,
}: {
  host: string;
  email: string;
  token: string;
  session: Jmap.Session;
  connector: { id?: string; label?: string };
}) => {
  const account = email.length > 0 ? email : session.username;
  const accessToken = Obj.make(AccessToken.AccessToken, {
    source: host,
    ...(account ? { account } : {}),
    token,
  });
  const connection = Connection.make({
    name: connector.label ?? 'JMAP',
    connectorId: connector.id,
    accessToken: Ref.make(accessToken),
  });
  return { accessToken, connection };
};

/** Discovers the JMAP session for the given host/token, surfacing a friendly message on 401. */
const fetchSession = (host: string, token: string) =>
  Jmap.getSession.pipe(
    Effect.provide(Layer.mergeAll(FetchHttpClient.layer, JmapCredentials.fromValues({ host, token }))),
    Effect.mapError((error) =>
      error instanceof JmapApiError && error.status === 401
        ? new Error('The JMAP server rejected the token (401). Check the host and API token and try again.')
        : error instanceof Error
          ? error
          : new Error(String(error)),
    ),
  );
