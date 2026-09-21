//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';

import { CrmOperation } from '#types';

export const SenderAction = Capability.makeModule(
  'SenderAction',
  { requires: [ClientCapabilities.Client], provides: [InboxCapabilities.SenderAction], activatesOn: InboxEvents.Start },
  Effect.fnUntraced(function* () {
    // The operation takes the endpoint as input and has no other source that reaches the app, so
    // resolve it here where the client config is available.
    const client = yield* ClientCapabilities.Client;
    const imageServiceUrl = getEdgeServiceEndpoint(client.config, EdgeServiceName.Image);

    return Capability.contributeAll(InboxCapabilities.SenderAction, [
      {
        id: 'research-sender',
        label: 'Research sender',
        icon: 'ph--user-focus--regular',
        createInvocations: (actor) => {
          // No address means no way to resolve the Person, so the entry is omitted rather than failing
          // when clicked.
          const contact = actor.contact;
          if (!contact) {
            return [];
          }

          return [
            { operation: CrmOperation.ResearchPerson, input: { subject: contact } },
            { operation: CrmOperation.EnrichImages, input: { limit: 4, imageServiceUrl } },
          ];
        },
      },
    ]);
  }),
);
