//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Message } from '@dxos/types';

import { MessengerCapabilities, MessengerOperation } from '#types';

const handler: Operation.WithHandler<typeof MessengerOperation.Send> = MessengerOperation.Send.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ recipientDid, text, subject, link }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const sender = yield* Capability.get(MessengerCapabilities.Sender);
      const identity = client.halo.identity.get();
      const message = Message.make({
        sender: { identityDid: identity?.did, name: identity?.profile?.displayName },
        blocks: [{ _tag: 'text', text }],
        attachments: link ? [{ ref: link }] : undefined,
        properties: subject ? { subject } : undefined,
      });
      yield* sender.send(recipientDid, message);
    }),
  ),
);

export default handler;
