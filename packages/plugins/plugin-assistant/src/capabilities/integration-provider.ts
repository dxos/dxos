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

/**
 * Manual-credential form for the Anthropic BYOK provider.
 *
 * The user supplies an Anthropic API key from `console.anthropic.com`. We validate it against
 * `GET https://api.anthropic.com/v1/models` so an obviously-wrong paste fails the form rather than
 * silently producing an Integration that 401s on every later request. Non-auth failures (5xx, CORS
 * blocks, network errors) are tolerated — a key the validator could not check is still saved.
 */
const AnthropicTokenForm = Schema.Struct({
  token: Schema.String.annotations({
    title: 'API key',
    description: 'Your Anthropic API key — find it at https://console.anthropic.com/settings/keys.',
  }),
});

const validateAnthropicKey = (token: string) =>
  Effect.gen(function* () {
    // Best-effort validation: CORS / network failures from the fetch itself do not block save.
    // We only refuse the save when Anthropic explicitly returns 401/403 for a token shape it could parse.
    const result = yield* Effect.either(
      Effect.tryPromise(() =>
        fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': token,
            'anthropic-version': '2023-06-01',
          },
        }),
      ),
    );
    if (result._tag === 'Right' && (result.right.status === 401 || result.right.status === 403)) {
      return yield* Effect.fail(
        new Error('Anthropic rejected the key as invalid. Re-check the key in the Anthropic console and retry.'),
      );
    }
  });

const credentialForm: CredentialForm<Schema.Schema.Type<typeof AnthropicTokenForm>> = {
  schema: AnthropicTokenForm,
  defaultValues: { token: '' },
  // Validation failures (empty key, 401/403 from Anthropic) stay in the error channel so the
  // generic provider-form dialog can surface them via `Effect.catchAll`. Squashing them with
  // `Effect.orDie` would turn them into defects that bypass the dialog's failure handler.
  onSubmit: ({ values, provider }) =>
    Effect.gen(function* () {
      const token = values.token.trim();
      if (token.length === 0) {
        return yield* Effect.fail(new Error('Anthropic API key is required.'));
      }
      yield* validateAnthropicKey(token);
      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: ANTHROPIC_SOURCE,
        token,
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

/**
 * Contributes the Anthropic `IntegrationProvider` entry. A user who enables `plugin-assistant`
 * sees "Anthropic" in the standard Create Integration provider picker; selecting it pastes their
 * Anthropic API key and creates a paired `AccessToken` (`source = 'anthropic.com'`) + `Integration`
 * (`providerId = 'anthropic'`) in the active space. Outbound AI requests then carry that token as
 * `X-BYOK` (see `byokHeaderLayer` in `@dxos/functions`).
 */
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
