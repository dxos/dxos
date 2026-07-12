//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Connection, Connector } from '@dxos/plugin-connector';
import { AccessToken } from '@dxos/types';

import { IDEOGRAM_CONNECTOR_ID, IDEOGRAM_SOURCE } from '../constants';

const IdeogramTokenForm = Schema.Struct({
  token: Schema.String.annotations({
    title: 'API key',
    description: 'The Ideogram API key from https://ideogram.ai/manage-api.',
  }),
});
type IdeogramTokenFormValues = Schema.Schema.Type<typeof IdeogramTokenForm>;

/**
 * Builds the Ideogram connector entry: stores the API key as `AccessToken.token` (source
 * `ideogram.ai`) so `plugin-image`'s generate operation can resolve it via
 * `CredentialsService`. Mirrors plugin-ibkr's non-OAuth `credentialForm` connector.
 */
export const createIdeogramConnectorEntry = () => ({
  id: IDEOGRAM_CONNECTOR_ID,
  source: IDEOGRAM_SOURCE,
  label: 'Ideogram',
  credentialForm: {
    schema: IdeogramTokenForm,
    defaultValues: { token: '' } satisfies Partial<IdeogramTokenFormValues>,
    onSubmit: ({ values, connector }: { values: IdeogramTokenFormValues; connector: { id: string; label?: string } }) =>
      Effect.sync(() => {
        const token = values.token.trim();
        if (!token) {
          throw new Error('Ideogram connection requires an API key.');
        }

        const accessToken = Obj.make(AccessToken.AccessToken, {
          source: IDEOGRAM_SOURCE,
          token,
        });
        const connection = Obj.make(Connection.Connection, {
          name: connector.label ?? 'Ideogram',
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });
        return { kind: 'complete' as const, accessToken, connection };
      }),
  },
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [createIdeogramConnectorEntry()]);
  }),
);
