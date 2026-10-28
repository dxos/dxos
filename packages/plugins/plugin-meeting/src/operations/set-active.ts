// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';

import { Meeting, MeetingCapabilities, MeetingOperation } from '#types';

const handler: Operation.WithHandler<typeof MeetingOperation.SetActive> = MeetingOperation.SetActive.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object }) {
      const store = yield* Capability.get(MeetingCapabilities.State);
      const callManager = yield* Capability.get(CallsCapabilities.Manager);
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      store.updateState((current) => ({ ...current, activeMeeting: object }));

      // The activity is one last-write-wins value shared with the transcription fields: re-announcing the advertised
      // meeting would race a concurrent transcription toggle and drop those fields, while a new meeting resets them.
      const typename = Type.getTypename(Meeting.Meeting);
      invariant(typename, 'Meeting has no typename');
      const meetingId = object ? Obj.getURI(object) : '';
      if (registry.get(callManager.activityAtom(typename))?.payload?.meetingId !== meetingId) {
        callManager.setActivity(typename, { meetingId });
      }
      return { object };
    }),
  ),
);

export default handler;
