//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { OAuthProvider } from '@dxos/protocols';
import { AccessToken } from '@dxos/types';

import { Connection, Connector, type ConnectorEntry, type CredentialForm } from '#types';

import { ATMOSPHERE_PROVIDER_ID, ATMOSPHERE_SOURCE, ATPROTO_OAUTH_SCOPES, CUSTOM_PROVIDER_ID } from '../constants';

/** Default form for manually entered access tokens (custom connector). */
const CustomTokenForm = Schema.Struct({
  source: Format.Hostname.annotations({
    title: 'Source',
    description: 'The domain name of the service that issued the token.',
    examples: ['example.com'],
  }),
  account: Schema.String.annotations({
    title: 'Account',
    description: 'Optional account label associated with the token.',
  }).pipe(Schema.optional),
  token: Schema.String.annotations({
    title: 'Token',
    description: 'The access token value.',
  }),
});

/** Pre-flight form for the Atmosphere (atproto) OAuth flow: the user's handle becomes the login hint. */
const AtprotoPreflightForm = Schema.Struct({
  handle: Schema.String.annotations({
    title: 'Handle',
    description: 'Your atproto handle or DID (e.g. user.bsky.social).',
    examples: ['user.bsky.social'],
  }),
});

const atprotoCredentialForm: CredentialForm<Schema.Schema.Type<typeof AtprotoPreflightForm>> = {
  schema: AtprotoPreflightForm,
  defaultValues: { handle: '' },
  onSubmit: ({ values }) => Effect.succeed({ kind: 'oauth', loginHint: values.handle.trim() }),
};

/**
 * Built-in {@link Connector} entries: just the manual-token connector.
 * Service-specific connectors (Bluesky, Trello, GitHub, …) live in their
 * own plugins and contribute on `SetupConnectors`.
 */
export default Capability.makeModule<ConnectorEntry[]>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [
      {
        id: CUSTOM_PROVIDER_ID,
        // The user enters the source in the dialog; we don't know it ahead of time.
        source: '',
        label: 'Custom Token',
        credentialForm: {
          schema: CustomTokenForm,
          defaultValues: { source: '', token: '' },
          onSubmit: ({ values, connector }) =>
            Effect.sync(() => {
              const accessToken = Obj.make(AccessToken.AccessToken, {
                source: values.source,
                account: values.account,
                token: values.token,
              });
              const connection = Obj.make(Connection.Connection, {
                name: connector.label ?? values.account ?? values.source,
                connectorId: connector.id,
                accessToken: Ref.make(accessToken),
              });
              return { kind: 'complete', accessToken, connection };
            }),
        },
      },
      {
        // Atmosphere: the same atproto OAuth flow as the Bluesky connector but credential-only — no
        // sync targets. Connects an atproto account without syncing feeds, and is the connector the
        // OAuth account-recovery flow routes its Connection to.
        id: ATMOSPHERE_PROVIDER_ID,
        source: ATMOSPHERE_SOURCE,
        label: 'Atmosphere',
        oauth: {
          provider: OAuthProvider.ATPROTO,
          scopes: [...ATPROTO_OAUTH_SCOPES],
          // bsky.social nullifies window.opener, so popup + postMessage can't be used; rely on Edge
          // redirecting to `/redirect/oauth`.
          useRedirectFlow: true,
        },
        credentialForm: atprotoCredentialForm,
      },
      // GitHub, Linear, and Slack are implemented as dedicated plugins
      // (`@dxos/plugin-github`, `@dxos/plugin-linear`, `@dxos/plugin-slack`).
    ]);
  }),
);
