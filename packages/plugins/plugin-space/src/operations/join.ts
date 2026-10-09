// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';
import * as HaloServices from '@dxos/plugin-client/HaloServices';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

import { JOIN_DIALOG } from '../constants.ts';
import type { JoinDialogProps } from '../containers/JoinDialog/index.ts';
import { NoIdentityError } from '../errors.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.Join> = SpaceOperation.Join.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const identity = yield* Identity.getSnapshot.pipe(Effect.provide(HaloServices.layer));
      if (Option.isNone(identity)) {
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
