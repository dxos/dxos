//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Feed, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';

import { Meeting, MeetingOperation } from '#types';

const handler: Operation.WithHandler<typeof MeetingOperation.SetTranscription> = MeetingOperation.SetTranscription.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ meeting, enabled }) {
      const callManager = yield* Capability.get(CallsCapabilities.Manager);
      const transcript = yield* Effect.promise(() => meeting.transcript.load());
      const transcriptFeed = yield* Effect.promise(() => transcript.feed.load());
      const transcriptFeedUri = Feed.getFeedUri(transcriptFeed);
      invariant(transcriptFeedUri, 'Transcript feed has no feed URI');
      const typename = Type.getTypename(Meeting.Meeting);
      invariant(typename, 'Meeting has no typename');
      // One activity update, so every participant binds the same feed and flips transcription together.
      callManager.setActivity(typename, {
        meetingId: Obj.getURI(meeting),
        transcriptDxn: transcriptFeedUri.toString(),
        transcriptionEnabled: enabled,
      });
    }),
  ),
);

export default handler;
