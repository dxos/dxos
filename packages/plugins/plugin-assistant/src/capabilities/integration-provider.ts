//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import {
  type CredentialForm,
  Integration,
  IntegrationProvider as IntegrationProviderCapability,
} from '@dxos/plugin-integration';
import { AccessToken } from '@dxos/types';

import { ANTHROPIC_PROVIDER_ID, ANTHROPIC_SOURCE } from '../constants';

/** API-key form for the Anthropic BYOK provider; key is best-effort validated against `/v1/models`. */
const AnthropicTokenForm = Schema.Struct({
  token: Schema.String.annotations({
    title: 'API key',
    description: 'Your Anthropic API key — find it at https://console.anthropic.com/settings/keys.',
  }),
});

/**
 * Best-effort validation: 401/403 from Anthropic blocks the save; CORS/network failures
 * are tolerated so the form still works in environments where the direct browser call is blocked.
 */
const validateAnthropicKey = (apiKey: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () =>
      fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      }),
    catch: (cause) => cause,
  }).pipe(
    Effect.matchEffect({
      onSuccess: (response) =>
        response.status === 401 || response.status === 403
          ? Effect.fail(
              new Error('Invalid Anthropic API key. Check it at https://console.anthropic.com/settings/keys.'),
            )
          : Effect.void,
      onFailure: () => Effect.void,
    }),
  );

const credentialForm: CredentialForm<Schema.Schema.Type<typeof AnthropicTokenForm>> = {
  schema: AnthropicTokenForm,
  defaultValues: { token: '' },
  // Validates before the dialog closes so 401/403 errors are shown inline.
  onValidate: ({ values }) => validateAnthropicKey(values.token.trim()),
  onSubmit: ({ values, provider }) =>
    Effect.sync(() => {
      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: ANTHROPIC_SOURCE,
        token: values.token.trim(),
      });
      const integration = Obj.make(Integration.Integration, {
        name: provider.label ?? 'Anthropic',
        providerId: provider.id,
        accessToken: Ref.make(accessToken),
        targets: [],
      });
      return { kind: 'complete' as const, accessToken, integration };
    }),
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        id: ANTHROPIC_PROVIDER_ID,
        source: ANTHROPIC_SOURCE,
        label: 'Anthropic',
        credentialForm,
      },
    ]);
  }),
);
