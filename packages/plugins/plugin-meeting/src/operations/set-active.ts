// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { ThreadCapabilities } from '@dxos/plugin-thread';

import { Meeting, MeetingCapabilities } from '../types';
import { SetActive } from './definitions';

const handler: Operation.WithHandler<typeof SetActive> = SetActive.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object }) {
      const store = yield* Capability.get(MeetingCapabilities.State);
      const callManager = yield* Capability.get(ThreadCapabilities.CallManager);
      store.updateState((current) => ({ ...current, activeMeeting: object }));
      callManager.setActivity(Type.getTypename(Meeting.Meeting)!, {
        meetingId: object ? Obj.getDXN(object).toString() : '',
      });
      return { object };
    }),
  ),
);

export default handler;
