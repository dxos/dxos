//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Format, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { DEEPSEEK_CONNECTOR_ID, DEEPSEEK_SOURCE } from '../constants.ts';

const DeepSeekTokenForm = Schema.Struct({
  token: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({
    title: 'API key',
    description: 'The DeepSeek API key from https://platform.deepseek.com/api_keys.',
  }),
});
type DeepSeekTokenFormValues = Schema.Schema.Type<typeof DeepSeekTokenForm>;

type ConnectorRef = { id: string; label?: string };

/**
 * The DeepSeek credential form. Validation failures are `Effect.fail`, never a throw: a defect
 * bypasses the connector dialog's failure handler, which closes the dialog showing nothing.
 */
export const deepSeekCredentialForm = {
  schema: DeepSeekTokenForm,
  defaultValues: { token: '' } satisfies Partial<DeepSeekTokenFormValues>,
  // Validate before the dialog closes so an empty key fails inline; a failure raised from
  // `onSubmit` alone closes the dialog with nothing shown.
  onValidate: ({ values }: { values: DeepSeekTokenFormValues; connector: ConnectorRef }) =>
    Effect.gen(function* () {
      if (values.token.trim().length === 0) {
        return yield* Effect.fail(new Error('DeepSeek connection requires an API key.'));
      }
    }),
  onSubmit: ({ values, connector }: { values: DeepSeekTokenFormValues; connector: ConnectorRef }) =>
    Effect.gen(function* () {
      // Trim defensively: onValidate is optional and callers bypass it in tests.
      const token = values.token.trim();
      if (token.length === 0) {
        return yield* Effect.fail(new Error('DeepSeek connection requires an API key.'));
      }

      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: DEEPSEEK_SOURCE,
        token,
      });
      const connection = Obj.make(Connection.Connection, {
        name: connector.label ?? 'DeepSeek',
        connectorId: connector.id,
        accessToken: Ref.make(accessToken),
      });
      return { kind: 'complete' as const, accessToken, connection };
    }),
};

/**
 * Builds the DeepSeek connector entry: stores the API key as `AccessToken.token` (source
 * `deepseek.com`) so consumers can resolve it via `CredentialsService`.
 */
export const createDeepSeekConnectorEntry = () => ({
  id: DEEPSEEK_CONNECTOR_ID,
  source: DEEPSEEK_SOURCE,
  label: 'DeepSeek',
  credentialForm: deepSeekCredentialForm,
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [createDeepSeekConnectorEntry()]);
  }),
);
