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
 * Mailbox-scoped menu entries that are NOT feed passes. The cursored CRM pipeline moved to a
 * contributed processor (`mailbox-processor.ts`); what remains here is space-wide and belongs in a
 * menu, not a cascade.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // The operation takes the endpoint as input and has no other source that reaches the app, so
    // resolve it here where the client config is available.
    const client = yield* ClientCapabilities.Client;
    const imageServiceUrl = getEdgeServiceEndpoint(client.config, EdgeServiceName.Image);

    return Capability.contributeAll(InboxCapabilities.MailboxAction, [
      {
        // Space-wide rather than mailbox-scoped (the operation walks every Person/Organization
        // missing an image), but the mailbox menu is where a user is when contacts appear.
        id: 'find-images',
        label: 'Find images',
        icon: 'ph--user-circle--regular',
        createInvocation: () => ({ operation: CrmOperation.EnrichImages, input: { imageServiceUrl } }),
      },
    ]);
  }),
);
