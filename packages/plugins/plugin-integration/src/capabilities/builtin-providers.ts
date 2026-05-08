//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { OAuthProvider } from '@dxos/protocols';
import { AccessToken } from '@dxos/types';

import { Integration, IntegrationProvider, type IntegrationProviderEntry } from '#types';

import { ATPROTO_PROVIDER_ID, CUSTOM_PROVIDER_ID } from '../constants';

/** Default form for manually entered access tokens (custom provider). */
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

/** Schema for the atproto pre-flight form (handle / DID). */
const AtprotoPreflightForm = Schema.Struct({
  handle: Schema.String.annotations({
    title: 'Handle',
    description: 'Your atproto handle or DID (e.g. user.bsky.social).',
    examples: ['user.bsky.social'],
  }),
});

/**
 * Built-in `IntegrationProvider` entries: custom token + stub OAuth presets
 * awaiting dedicated service plugins.
 */
export default Capability.makeModule<IntegrationProviderEntry[]>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProvider, [
      {
        id: CUSTOM_PROVIDER_ID,
        // The user enters the source in the dialog; we don't know it ahead of time.
        source: '',
        label: 'Custom Token',
        credentialForm: {
          schema: CustomTokenForm,
          defaultValues: { source: '', token: '' },
          onSubmit: ({ values, provider }) =>
            Effect.sync(() => {
              const accessToken = Obj.make(AccessToken.AccessToken, {
                source: values.source,
                account: values.account,
                token: values.token,
              });
              const integration = Obj.make(Integration.Integration, {
                name: provider.label ?? values.account ?? values.source,
                providerId: provider.id,
                accessToken: Ref.make(accessToken),
                targets: [],
              });
              return { kind: 'complete', accessToken, integration };
            }),
        },
      },
      {
        id: ATPROTO_PROVIDER_ID,
        source: 'bsky.app',
        label: 'Bluesky',
        oauth: {
          provider: OAuthProvider.ATPROTO,
          scopes: ['transition:email', 'transition:generic'],
          // bsky.social nullifies window.opener, so popup + postMessage cannot
          // be used; rely on Edge redirecting to `/redirect/oauth` instead.
          useRedirectFlow: true,
        },
        credentialForm: {
          schema: AtprotoPreflightForm,
          defaultValues: { handle: '' },
          onSubmit: ({ values }) => Effect.succeed({ kind: 'oauth', loginHint: values.handle.trim() }),
        },
      },
      // TODO(wittjosiah): Implement linear, slack as dedicated plugins instead of presets.
      /*
      {
        id: 'linear',
        source: 'linear.app',
        label: 'Linear',
        oauth: {
          provider: OAuthProvider.LINEAR,
          scopes: ['read', 'write'],
        },
      },
      {
        id: 'slack',
        source: 'slack.com',
        label: 'Slack',
        oauth: {
          provider: OAuthProvider.SLACK,
          scopes: ['channels:read', 'chat:write', 'users:read'],
        },
      },
      */
    ]);
  }),
);
