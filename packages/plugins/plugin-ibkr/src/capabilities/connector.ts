//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Format, Obj, Ref } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import { Connection, Connector } from '@dxos/plugin-connector';

import { IBKR_CONNECTOR_ID, IBKR_SOURCE } from '../constants';

const IbkrTokenForm = Schema.Struct({
  token: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotations({
    title: 'Flex token',
    description: 'The Flex Web Service token from IBKR Account Management.',
  }),
  queryId: Schema.String.annotations({
    title: 'Flex query ID',
    description:
      'The id of the Activity Flex Query. Use a short period (Last Business Day or Last Month).\n' +
      '• Open Positions — keep only: Symbol, Position, Mark Price, Position Value, Cost Basis Price, Cost Basis Money, Unrealized P/L, Currency.\n' +
      '• Trades — Execution model only; keep only: Symbol, Buy/Sell, Quantity, TradePrice, Trade Date, IB Commission, Currency.\n' +
      '• Cash Report — keep only: Currency, Ending Cash.\n' +
      '• For tax: optionally set Open Positions to Lot level (adds Open Date, Cost Basis Money) and add a Trades → Closed Lots section (Open/Trade Date, Cost, Proceeds, Realized P/L). These are heavier and span the tax year — best as a separate annual query, not the daily one.\n' +
      'Heavy columns (Realized P/L, MTM P/L, Wash Sales, full-history cost basis) and long periods force full-history computation and cause error 1001.',
  }),
});
type IbkrTokenFormValues = Schema.Schema.Type<typeof IbkrTokenForm>;

/**
 * Builds the IBKR connector entry: maps the Flex token to AccessToken.token
 * and the Flex query ID to AccessToken.account so downstream AI tools can
 * retrieve it via CredentialsService.account without exposing the secret.
 */
export const createIbkrConnectorEntry = () => ({
  id: IBKR_CONNECTOR_ID,
  source: IBKR_SOURCE,
  label: 'Interactive Brokers',
  credentialForm: {
    schema: IbkrTokenForm,
    defaultValues: { token: '', queryId: '' } satisfies Partial<IbkrTokenFormValues>,
    onSubmit: ({ values, connector }: { values: IbkrTokenFormValues; connector: { id: string; label?: string } }) =>
      Effect.sync(() => {
        const token = values.token.trim();
        const queryId = values.queryId.trim();
        if (!token || !queryId) {
          throw new Error('Interactive Brokers connection requires both Flex token and Flex query ID.');
        }

        // The Flex query ID is non-secret and stored in account;
        // it reaches AI tools via CredentialsService.account.
        const accessToken = Obj.make(AccessToken.AccessToken, {
          source: IBKR_SOURCE,
          account: queryId,
          token,
        });
        const connection = Obj.make(Connection.Connection, {
          name: connector.label ?? 'Interactive Brokers',
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });
        return { kind: 'complete' as const, accessToken, connection };
      }),
  },
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Connector, [createIbkrConnectorEntry()]);
  }),
);
