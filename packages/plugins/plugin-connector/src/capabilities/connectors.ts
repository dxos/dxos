//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { AccessToken } from '@dxos/types';

import { Connection, Connector, type ConnectorEntry } from '#types';

import { CUSTOM_PROVIDER_ID } from '../constants';

/** Default form for manually entered access tokens (custom connector). */
const CustomTokenForm = Schema.Struct({
  source: Format.Hostname.annotations({
    title: 'Source',
    description: 'The domain name of the service that issued the token.',
    examples: ['example.com'],
  }),
  account: Schema.String.annotations({
    title: 'Account',
    description: 'Optional account label associated with the token.',
  }).pipe(Schema.optional),
  token: Schema.String.annotations({
    title: 'Token',
    description: 'The access token value.',
  }),
});

/**
 * Built-in {@link Connector} entries: just the manual-token connector.
 * Service-specific connectors (atproto/Atmosphere in `@dxos/plugin-atproto`, Bluesky, Trello,
 * GitHub, …) live in their own plugins and contribute on `SetupConnectors`.
 */
export default Capability.makeModule<ConnectorEntry[]>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [
      {
        id: CUSTOM_PROVIDER_ID,
        // The user enters the source in the dialog; we don't know it ahead of time.
        source: '',
        label: 'Custom Token',
        credentialForm: {
          schema: CustomTokenForm,
          defaultValues: { source: '', token: '' },
          onSubmit: ({ values, connector }) =>
            Effect.sync(() => {
              const accessToken = Obj.make(AccessToken.AccessToken, {
                source: values.source,
                account: values.account,
                token: values.token,
              });
              const connection = Obj.make(Connection.Connection, {
                name: connector.label ?? values.account ?? values.source,
                connectorId: connector.id,
                accessToken: Ref.make(accessToken),
              });
              return { kind: 'complete', accessToken, connection };
            }),
        },
      },
      // Atmosphere (atproto), Bluesky, GitHub, Linear, and Slack are implemented as dedicated plugins
      // (`@dxos/plugin-atproto`, `@dxos/plugin-bluesky`, `@dxos/plugin-github`, …) and contribute on
      // `SetupConnectors`.
    ]);
  }),
);
