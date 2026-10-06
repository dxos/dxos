//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { JOIN_DIALOG } from '../constants.ts';
import * as ClientOperation from '../types/ClientOperation.ts';

const handler: Operation.WithHandler<typeof ClientOperation.JoinIdentity> = ClientOperation.JoinIdentity.pipe(
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
