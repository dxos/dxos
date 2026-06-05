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
 * The user supplies an Anthropic API key from `console.anthropic.com`. The key is stored as-is
 * with no validation — BYOK enforcement happens on the edge.
 */
const AnthropicTokenForm = Schema.Struct({
  token: Schema.String.annotations({
    title: 'API key',
    description: 'Your Anthropic API key — find it at https://console.anthropic.com/settings/keys.',
  }),
});

const credentialForm: CredentialForm<Schema.Schema.Type<typeof AnthropicTokenForm>> = {
  schema: AnthropicTokenForm,
  defaultValues: { token: '' },
  onSubmit: ({ values, provider }) =>
    Effect.sync(() => {
      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: ANTHROPIC_SOURCE,
        token: values.token,
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
 * (`providerId = 'anthropic'`) in the active space.
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
