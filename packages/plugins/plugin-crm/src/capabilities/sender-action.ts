//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { CrmOperation } from '#types';

/**
 * Injects sender research into plugin-inbox's per-message conversation menu: one entry that profiles
 * the sender and then fetches their image.
 *
 * Two invocations rather than one composite operation, run in order — the image pass reads whatever the
 * profile step wrote, and `EnrichImages` is set-scoped (it walks objects missing an image, bounded by
 * `limit`) rather than taking a subject, so there is nothing to fuse them into today.
 *
 * Only people are offered: `ResearchOrganization` needs an Organization, and a sender's employer is not
 * reliably known at this point — the record view's own Research action covers organizations.
 */
export default Capability.makeModule(
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
