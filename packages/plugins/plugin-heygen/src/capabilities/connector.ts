//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { AccessToken } from '@dxos/cursor';
import { Obj, Ref } from '@dxos/echo';
import { Connection, Connector } from '@dxos/plugin-connector';

import { HEYGEN_CONNECTOR_ID, HEYGEN_SOURCE } from '../constants';

const HeyGenTokenForm = Schema.Struct({
  token: Schema.String.annotations({
    title: 'API key',
    description: 'The HeyGen API key from https://app.heygen.com/settings (API).',
  }),
});
type HeyGenTokenFormValues = Schema.Schema.Type<typeof HeyGenTokenForm>;

/**
 * Builds the HeyGen connector entry: stores the API key as `AccessToken.token` (source
 * `heygen.com`) so `plugin-studio`'s generate operation can resolve it via `CredentialsService`.
 * Mirrors plugin-ibkr's non-OAuth `credentialForm` connector.
 */
export const createHeyGenConnectorEntry = () => ({
  id: HEYGEN_CONNECTOR_ID,
  source: HEYGEN_SOURCE,
  label: 'HeyGen',
  credentialForm: {
    schema: HeyGenTokenForm,
    defaultValues: { token: '' } satisfies Partial<HeyGenTokenFormValues>,
    onSubmit: ({ values, connector }: { values: HeyGenTokenFormValues; connector: { id: string; label?: string } }) =>
      Effect.sync(() => {
        const token = values.token.trim();
        if (!token) {
          throw new Error('HeyGen connection requires an API key.');
        }

        const accessToken = Obj.make(AccessToken.AccessToken, {
          source: HEYGEN_SOURCE,
          token,
        });
        const connection = Obj.make(Connection.Connection, {
          name: connector.label ?? 'HeyGen',
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });
        return { kind: 'complete' as const, accessToken, connection };
      }),
  },
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [createHeyGenConnectorEntry()]);
  }),
);
