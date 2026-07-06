// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { ClientCapabilities } from '@dxos/plugin-client';

import { meta } from '#meta';

import { JOIN_DIALOG } from '../constants';
import { type JoinDialogProps } from '../containers/JoinDialog';
import { NoIdentityError } from '../errors';
import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.Join> = SpaceOperation.Join.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      if (!client.halo.identity.get()) {
        // Space invitations authenticate against a local identity; there is nothing to redeem without one.
        yield* Effect.ignore(
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.profile.key}.join-no-identity`,
            icon: 'ph--warning--regular',
            title: ['join-no-identity-toast.title', { ns: meta.profile.key }],
            closeLabel: ['dismiss.label', { ns: meta.profile.key }],
          }),
        );
        return yield* Effect.fail(new NoIdentityError());
      }

      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: JOIN_DIALOG,
        blockAlign: 'start',
        props: {
          initialInvitationCode: input.invitationCode,
          onDone: input.onDone,
        } satisfies Partial<JoinDialogProps>,
      });
    }),
  ),
);
export default handler;
