//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Format, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { ANTHROPIC_PROVIDER_ID, ANTHROPIC_SOURCE, DEEPSEEK_PROVIDER_ID, DEEPSEEK_SOURCE } from '../constants.ts';

/** API-key form for the Anthropic BYOK provider; key is best-effort validated against `/v1/models`. */
const AnthropicTokenForm = Schema.Struct({
  token: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({
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

/** API-key form for the DeepSeek BYOK provider; key is best-effort validated against `/models`. */
const DeepSeekTokenForm = Schema.Struct({
  token: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({
    title: 'API key',
    description: 'Your DeepSeek API key — find it at https://platform.deepseek.com/api_keys.',
  }),
});

/** Best-effort validation, on the same terms as {@link validateAnthropicKey}. */
const validateDeepSeekKey = (apiKey: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () => fetch('https://api.deepseek.com/models', { headers: { Authorization: `Bearer ${apiKey}` } }),
    catch: (cause) => cause,
  }).pipe(
    Effect.matchEffect({
      onSuccess: (response) =>
        response.status === 401 || response.status === 403
          ? Effect.fail(new Error('Invalid DeepSeek API key. Check it at https://platform.deepseek.com/api_keys.'))
          : Effect.void,
      onFailure: () => Effect.void,
    }),
  );

type TokenValues = { readonly token: string };

/** One API-key credential form; both providers differ only in schema, source and validation. */
const makeCredentialForm = ({
  schema,
  source,
  label,
  validate,
}: {
  schema: Schema.Codec<TokenValues, any>;
  source: string;
  label: string;
  validate: (apiKey: string) => Effect.Effect<void, Error>;
}): ConnectorSpec.CredentialForm<TokenValues> => ({
  schema,
  defaultValues: { token: '' },
  // Validates before the dialog closes so 401/403 errors are shown inline.
  onValidate: ({ values }) => validate(values.token.trim()),
  onSubmit: ({ values, connector }) =>
    Effect.sync(() => {
      const accessToken = Obj.make(AccessToken.AccessToken, { source, token: values.token.trim() });
      const connection = Obj.make(Connection.Connection, {
        name: connector.label ?? label,
        connectorId: connector.id,
        accessToken: Ref.make(accessToken),
      });
      return { kind: 'complete' as const, accessToken, connection };
    }),
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [
      {
        id: ANTHROPIC_PROVIDER_ID,
        source: ANTHROPIC_SOURCE,
        label: 'Anthropic',
        credentialForm: makeCredentialForm({
          schema: AnthropicTokenForm,
          source: ANTHROPIC_SOURCE,
          label: 'Anthropic',
          validate: validateAnthropicKey,
        }),
      },
      {
        id: DEEPSEEK_PROVIDER_ID,
        source: DEEPSEEK_SOURCE,
        label: 'DeepSeek',
        credentialForm: makeCredentialForm({
          schema: DeepSeekTokenForm,
          source: DEEPSEEK_SOURCE,
          label: 'DeepSeek',
          validate: validateDeepSeekKey,
        }),
      },
    ]);
  }),
);
