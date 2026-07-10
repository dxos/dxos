// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls/types';

import { Meeting, MeetingCapabilities, MeetingOperation } from '#types';

const handler: Operation.WithHandler<typeof MeetingOperation.SetActive> = MeetingOperation.SetActive.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object }) {
      const store = yield* Capability.get(MeetingCapabilities.State);
      const callManager = yield* Capability.get(CallsCapabilities.Manager);
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      store.updateState((current) => ({ ...current, activeMeeting: object }));

      // The activity is a single last-write-wins value shared with the transcription fields
      // (`transcriptDxn`/`transcriptionEnabled`). Re-announcing an already-advertised meeting would
      // mint a competing concurrent write (racing e.g. the transcription toggle for the same version
      // slot) and drop the sibling fields — so it is skipped outright. Switching to a different
      // meeting intentionally resets them.
      const typename = Type.getTypename(Meeting.Meeting)!;
      const meetingId = object ? Obj.getURI(object) : '';
      const current = registry.get(callManager.activityAtom(typename))?.payload;
      if (current?.meetingId !== meetingId) {
        callManager.setActivity(typename, { meetingId });
      }
      return { object };
    }),
  ),
);

export default handler;
