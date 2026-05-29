// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls';

import { Meeting, MeetingCapabilities, MeetingOperation } from '../types';

const handler: Operation.WithHandler<typeof MeetingOperation.SetActive> = MeetingOperation.SetActive.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object }) {
      const store = yield* Capability.get(MeetingCapabilities.State);
      const callManager = yield* Capability.get(CallsCapabilities.Manager);
      store.updateState((current) => ({ ...current, activeMeeting: object }));
      callManager.setActivity(Type.getTypename(Meeting.Meeting)!, {
        meetingId: object ? Obj.getURI(object) : '',
      });
      return { object };
    }),
  ),
);

export default handler;
