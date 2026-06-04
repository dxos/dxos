//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { AccessToken } from '@dxos/types';

import { Integration, IntegrationProvider, type IntegrationProviderEntry } from '#types';

import { ATPROTO_PROVIDER_ID, ATPROTO_SOURCE, CUSTOM_PROVIDER_ID } from '../constants';

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

/**
 * Built-in `IntegrationProvider` entries: just the manual-token provider.
 * Service-specific providers (Bluesky, Trello, GitHub, …) live in their
 * own plugins and contribute on `SetupIntegrationProviders`.
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
        // Default atproto integration. Credential-only: no sync, no OAuth/credential form. Its
        // Integrations are created by the OAuth account-recovery flow (which already holds the
        // verified token), so it's hidden from the manual "add integration" picker; lookups by id
        // still resolve it (e.g. to label the connected account).
        id: ATPROTO_PROVIDER_ID,
        source: ATPROTO_SOURCE,
        label: 'Atmosphere',
        hidden: true,
      },
      // GitHub, Linear, and Slack are implemented as dedicated plugins
      // (`@dxos/plugin-github`, `@dxos/plugin-linear`, `@dxos/plugin-slack`).
    ]);
  }),
);
