//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { TYPESAFE_API_KEYS_URL, TYPESAFE_CONNECTOR_ID, TYPESAFE_SOURCE } from '../constants.ts';
import { MissingApiKeyError } from '../errors.ts';

const TypeSafeTokenForm = ConnectorSpec.TokenForm({
  title: 'API key',
  description: `The TypeSafe System One API key from ${TYPESAFE_API_KEYS_URL}.`,
});
type TypeSafeTokenFormValues = Schema.Schema.Type<typeof TypeSafeTokenForm>;

type ConnectorRef = { id: string; label?: string };

/**
 * The TypeSafe credential form. Validation failures are `Effect.fail`, never a throw: a defect
 * bypasses the connector dialog's failure handler, which closes the dialog showing nothing.
 */
export const typeSafeCredentialForm = {
  schema: TypeSafeTokenForm,
  defaultValues: { token: '' } satisfies Partial<TypeSafeTokenFormValues>,
  onValidate: ({ values }: { values: TypeSafeTokenFormValues; connector: ConnectorRef }) =>
    Effect.gen(function* () {
      if (values.token.trim().length === 0) {
        return yield* Effect.fail(new MissingApiKeyError());
      }
    }),
  onSubmit: ({ values, connector }: { values: TypeSafeTokenFormValues; connector: ConnectorRef }) =>
    Effect.gen(function* () {
      // Trim defensively: onValidate is optional and callers bypass it in tests.
      const token = values.token.trim();
      if (token.length === 0) {
        return yield* Effect.fail(new MissingApiKeyError());
      }

      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: TYPESAFE_SOURCE,
        token,
      });
      const connection = Obj.make(Connection.Connection, {
        name: connector.label ?? 'TypeSafe',
        connectorId: connector.id,
        accessToken: Ref.make(accessToken),
      });
      return { kind: 'complete' as const, accessToken, connection };
    }),
};

/**
 * Builds the TypeSafe connector entry: stores the API key as `AccessToken.token` (source
 * `typesafe.ai`) so the decision-model layer can resolve it via `CredentialsService`.
 */
export const createTypeSafeConnectorEntry = () => ({
  id: TYPESAFE_CONNECTOR_ID,
  source: TYPESAFE_SOURCE,
  label: 'TypeSafe',
  credentialForm: typeSafeCredentialForm,
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [createTypeSafeConnectorEntry()]);
  }),
);
