//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { JoinIdentity } from './definitions';

import { JOIN_DIALOG } from '../constants';

const handler: Operation.WithHandler<typeof JoinIdentity> = JoinIdentity.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: JOIN_DIALOG,
        blockAlign: 'start',
        props: {
          initialInvitationCode: data.invitationCode,
          initialDisposition: 'accept-halo-invitation',
        },
      });
    }),
  ),
);

export default handler;
