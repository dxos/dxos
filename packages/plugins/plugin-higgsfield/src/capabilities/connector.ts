//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Format, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { HIGGSFIELD_CONNECTOR_ID, HIGGSFIELD_SOURCE } from '../constants.ts';
import { joinCredential } from '../services/higgsfield-credential.ts';

const HiggsfieldCredentialForm = Schema.Struct({
  keyId: Schema.String.annotate({
    title: 'API key ID',
    description: 'The key ID from https://cloud.higgsfield.ai (API keys).',
  }),
  keySecret: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({
    title: 'API key secret',
    description: 'The secret issued with the key ID.',
  }),
});
type HiggsfieldCredentialFormValues = Schema.Schema.Type<typeof HiggsfieldCredentialForm>;

/**
 * Builds the Higgsfield connector entry: the API takes a two-part `Key <id>:<secret>` credential, so
 * the form has two fields joined into one `AccessToken.token` (source `higgsfield.ai`) — studio's
 * `CredentialsService` lookup yields a single string, which the provider splits back into the header.
 */
export const createHiggsfieldConnectorEntry = () => ({
  id: HIGGSFIELD_CONNECTOR_ID,
  source: HIGGSFIELD_SOURCE,
  label: 'Higgsfield',
  credentialForm: {
    schema: HiggsfieldCredentialForm,
    defaultValues: { keyId: '', keySecret: '' } satisfies Partial<HiggsfieldCredentialFormValues>,
    onSubmit: ({
      values,
      connector,
    }: {
      values: HiggsfieldCredentialFormValues;
      connector: { id: string; label?: string };
    }) =>
      Effect.sync(() => {
        const token = joinCredential(values.keyId, values.keySecret);
        if (!token) {
          throw new Error('Higgsfield connection requires both an API key ID and secret.');
        }

        const accessToken = Obj.make(AccessToken.AccessToken, {
          source: HIGGSFIELD_SOURCE,
          token,
        });
        const connection = Obj.make(Connection.Connection, {
          name: connector.label ?? 'Higgsfield',
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });
        return { kind: 'complete' as const, accessToken, connection };
      }),
  },
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [createHiggsfieldConnectorEntry()]);
  }),
);
