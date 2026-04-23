// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { SpaceOperation } from './definitions';
import { SpaceOperationConfig } from './helpers';

const handler: Operation.WithHandler<typeof SpaceOperation.GetShareLink> = SpaceOperation.GetShareLink.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { Invitation, InvitationEncoder } = yield* Effect.promise(() => import('@dxos/react-client/invitations'));

      const invitation = yield* Operation.invoke(SpaceOperation.Share, {
        space: input.space,
        type: Invitation.Type.DELEGATED,
        authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
        multiUse: true,
        target: input.target,
      });

      const invitationCode = yield* Effect.tryPromise(
        () =>
          new Promise<string>((resolve) => {
            invitation.subscribe((inv) => {
              if (inv.state === Invitation.State.CONNECTING) {
                resolve(InvitationEncoder.encode(inv));
              }
            });
          }),
      );
      const { createInvitationUrl } = yield* Capability.get(SpaceOperationConfig);
      const url = createInvitationUrl(invitationCode);
      if (input.copyToClipboard) {
        yield* Effect.tryPromise(() => navigator.clipboard.writeText(url));
      }
      return url;
    }),
  ),
);
export default handler;
