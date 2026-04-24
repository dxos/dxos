// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { JOIN_DIALOG } from '../constants';
import { type JoinDialogProps } from '../containers/JoinDialog';
import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.Join> = SpaceOperation.Join.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
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
