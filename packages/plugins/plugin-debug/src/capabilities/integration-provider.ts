//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Integration, IntegrationProvider, type IntegrationProviderEntry } from '@dxos/plugin-integration';
import { AccessToken } from '@dxos/types';

const EdgeAdminTokenForm = Schema.Struct({
  token: Schema.String.annotations({
    title: 'Admin API Key',
    description: 'The DX_HUB_API_KEY secret configured on hub-service.',
  }),
});

export const EDGE_PROVIDER_ID = 'edge';

/** Integration provider that stores an edge admin API key for the Hub Admin devtools section. */
export default Capability.makeModule<IntegrationProviderEntry[]>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProvider, [
      {
        id: EDGE_PROVIDER_ID,
        source: 'edge',
        label: 'Edge Admin',
        credentialForm: {
          schema: EdgeAdminTokenForm,
          defaultValues: { token: '' },
          onSubmit: ({ values, provider }) =>
            Effect.sync(() => {
              const accessToken = Obj.make(AccessToken.AccessToken, {
                source: 'edge',
                token: values.token,
              });
              const integration = Obj.make(Integration.Integration, {
                name: provider.label ?? 'Edge Admin',
                providerId: provider.id,
                accessToken: Ref.make(accessToken),
                targets: [],
              });
              return { kind: 'complete', accessToken, integration };
            }),
        },
      },
    ]);
  }),
);
