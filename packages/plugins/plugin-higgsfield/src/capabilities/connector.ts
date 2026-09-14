//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Format, Obj, Ref } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
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

type ConnectorRef = { id: string; label?: string };

const INCOMPLETE_CREDENTIAL_MESSAGE = 'Higgsfield connection requires both an API key ID and secret.' as const;

/** The form was submitted with a blank key ID or secret; its `message` is shown inline in the dialog. */
export class HiggsfieldCredentialError extends BaseError.extend(
  'HiggsfieldCredentialError',
  INCOMPLETE_CREDENTIAL_MESSAGE,
) {}

/**
 * Builds the Higgsfield connector entry: the API takes a two-part `Key <id>:<secret>` credential, so
 * the form has two fields joined into one `AccessToken.token` (source `higgsfield.ai`) — studio's
 * `CredentialsService` lookup yields a single string, which the provider splits back into the header.
 * Validation failures are `Effect.fail`, never a throw: a defect bypasses the dialog's failure handler.
 */
export const createHiggsfieldConnectorEntry = () => ({
  id: HIGGSFIELD_CONNECTOR_ID,
  source: HIGGSFIELD_SOURCE,
  label: 'Higgsfield',
  credentialForm: {
    schema: HiggsfieldCredentialForm,
    defaultValues: { keyId: '', keySecret: '' } satisfies Partial<HiggsfieldCredentialFormValues>,
    onValidate: ({ values }: { values: HiggsfieldCredentialFormValues; connector: ConnectorRef }) =>
      joinCredential(values.keyId, values.keySecret) ? Effect.void : Effect.fail(new HiggsfieldCredentialError()),
    onSubmit: ({ values, connector }: { values: HiggsfieldCredentialFormValues; connector: ConnectorRef }) =>
      Effect.gen(function* () {
        // Re-check here: `onValidate` is optional for callers and bypassed in tests.
        const token = joinCredential(values.keyId, values.keySecret);
        if (!token) {
          return yield* Effect.fail(new HiggsfieldCredentialError());
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
