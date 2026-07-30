//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import {
  ATMOSPHERE_PROVIDER_ID,
  ATMOSPHERE_SOURCE,
  ATPROTO_OAUTH_SCOPES,
  Connector,
  type ConnectorEntry,
  type CredentialForm,
} from '@dxos/plugin-connector';
import { OAuthProvider } from '@dxos/protocols';

/** Pre-flight form for the atproto OAuth flow: the user's handle becomes the login hint. */
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
 * The generic "Atmosphere" atproto connector: connects an atproto account (credential-only, no sync
 * targets) and is the connector the OAuth account-recovery flow routes its Connection to. Owned by
 * this plugin so the atproto connection capability lives with the rest of the atproto integration;
 * contributed on `SetupConnectors` like every other connector.
 */
export default Capability.makeModule<ConnectorEntry[]>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [
      {
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
    ]);
  }),
);
