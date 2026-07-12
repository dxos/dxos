//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Connection, Connector } from '@dxos/plugin-connector';
import { AccessToken } from '@dxos/types';

import { TYPEFULLY_CONNECTOR_ID, TYPEFULLY_SOURCE } from '../constants';

const TypefullyTokenForm = Schema.Struct({
  apiKey: Schema.String.annotations({
    title: 'API key',
    description: 'The API key from Typefully account settings.',
  }),
});
type TypefullyTokenFormValues = Schema.Schema.Type<typeof TypefullyTokenForm>;

/**
 * Builds the Typefully connector entry: maps the API key to `AccessToken.token`
 * so `PublisherService` (plugin-blogger) can authenticate via the resulting
 * `Connection`. Typefully uses a static API key, not OAuth.
 */
export const createTypefullyConnectorEntry = () => ({
  id: TYPEFULLY_CONNECTOR_ID,
  source: TYPEFULLY_SOURCE,
  label: 'Typefully',
  credentialForm: {
    schema: TypefullyTokenForm,
    defaultValues: { apiKey: '' } satisfies Partial<TypefullyTokenFormValues>,
    onSubmit: ({
      values,
      connector,
    }: {
      values: TypefullyTokenFormValues;
      connector: { id: string; label?: string };
    }) =>
      Effect.sync(() => {
        const apiKey = values.apiKey.trim();
        if (!apiKey) {
          throw new Error('Typefully connection requires an API key.');
        }

        const accessToken = Obj.make(AccessToken.AccessToken, {
          source: TYPEFULLY_SOURCE,
          token: apiKey,
        });
        const connection = Obj.make(Connection.Connection, {
          name: connector.label ?? 'Typefully',
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });
        return { kind: 'complete' as const, accessToken, connection };
      }),
  },
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [createTypefullyConnectorEntry()]);
  }),
);
