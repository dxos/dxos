// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Type } from '@dxos/echo';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';

import { Meeting, MeetingCapabilities, MeetingOperation } from '#types';

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
