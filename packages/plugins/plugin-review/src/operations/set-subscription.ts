//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Subscription } from '@dxos/types';

import { CommentOperation } from '#types';

const handler: Operation.WithHandler<typeof CommentOperation.SetSubscription> = CommentOperation.SetSubscription.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, subscribed }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const did = client.halo.identity.get()?.did;
      invariant(did, 'Identity not found');
      Subscription.set(subject, did, 'comments', subscribed);
    }),
  ),
);

export default handler;
