//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Format, Obj, Ref } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import { Connection, Connector } from '@dxos/plugin-connector';

import { TYPEFULLY_CONNECTOR_ID, TYPEFULLY_SOURCE } from '../constants';

const TypefullyTokenForm = Schema.Struct({
  token: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotations({
    title: 'API key',
    description: 'The Typefully API key (v2) from account settings (Settings → API).',
  }),
});
type TypefullyTokenFormValues = Schema.Schema.Type<typeof TypefullyTokenForm>;

/**
 * Builds the Typefully connector entry: stores the API key as `AccessToken.token` (source
 * `typefully.com`) so `PublisherService` (plugin-blogger) can authenticate via the resulting
 * `Connection`. Typefully uses a static API key, not OAuth. Mirrors plugin-ideogram/plugin-heygen.
 */
export const createTypefullyConnectorEntry = () => ({
  id: TYPEFULLY_CONNECTOR_ID,
  source: TYPEFULLY_SOURCE,
  label: 'Typefully',
  credentialForm: {
    schema: TypefullyTokenForm,
    defaultValues: { token: '' } satisfies Partial<TypefullyTokenFormValues>,
    onSubmit: ({
      values,
      connector,
    }: {
      values: TypefullyTokenFormValues;
      connector: { id: string; label?: string };
    }) =>
      Effect.sync(() => {
        const token = values.token.trim();
        if (!token) {
          throw new Error('Typefully connection requires an API key.');
        }

        const accessToken = Obj.make(AccessToken.AccessToken, {
          source: TYPEFULLY_SOURCE,
          token,
        });
        const connection = Obj.make(Connection.Connection, {
          name: connector.label ?? 'Typefully',
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });

        return {
          kind: 'complete' as const,
          accessToken,
          connection,
        };
      }),
  },
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [createTypefullyConnectorEntry()]);
  }),
);
