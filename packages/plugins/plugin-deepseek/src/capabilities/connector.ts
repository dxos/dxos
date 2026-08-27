//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Format, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { DEEPSEEK_CONNECTOR_ID, DEEPSEEK_SOURCE } from '../constants';

const DeepSeekTokenForm = Schema.Struct({
  token: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({
    title: 'API key',
    description: 'The DeepSeek API key from https://platform.deepseek.com/api_keys.',
  }),
});
type DeepSeekTokenFormValues = Schema.Schema.Type<typeof DeepSeekTokenForm>;

/**
 * Builds the DeepSeek connector entry: stores the API key as `AccessToken.token` (source
 * `deepseek.com`) so consumers can resolve it via `CredentialsService`.
 */
export const createDeepSeekConnectorEntry = () => ({
  id: DEEPSEEK_CONNECTOR_ID,
  source: DEEPSEEK_SOURCE,
  label: 'DeepSeek',
  credentialForm: {
    schema: DeepSeekTokenForm,
    defaultValues: { token: '' } satisfies Partial<DeepSeekTokenFormValues>,
    onSubmit: ({ values, connector }: { values: DeepSeekTokenFormValues; connector: { id: string; label?: string } }) =>
      Effect.sync(() => {
        const token = values.token.trim();
        if (!token) {
          throw new Error('DeepSeek connection requires an API key.');
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
  },
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [createDeepSeekConnectorEntry()]);
  }),
);
