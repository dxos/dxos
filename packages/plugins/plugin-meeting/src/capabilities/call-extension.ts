//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';
import * as TranscriptOperation from '@dxos/plugin-transcription/TranscriptOperation';

import { MeetingActivity, MeetingCapabilities, MeetingOperation } from '#types';

import { TranscriptSink, type TranscriptStage, type TranscriptTarget } from '../transcript/index.ts';

/**
 * Connects the call to the meeting it is for: follows the call's meeting activity, and writes the call's transcript
 * into that meeting's feed while transcription is on.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;
    const store = yield* MeetingCapabilities.State;
    const callManager = yield* Capability.get(CallsCapabilities.Manager);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const identity = yield* Capability.get(ClientCapabilities.IdentityService);

    /** The active meeting's transcript feed, resolved per segment so a meeting selected mid-call is written to. */
    const resolveTarget = async (): Promise<TranscriptTarget | undefined> => {
      const meeting = store.state.activeMeeting;
      const db = meeting && Obj.getDatabase(meeting);
      if (!meeting || !db) {
        return undefined;
      }
      const transcript = await meeting.transcript.load();
      return { db, feed: await transcript.feed.load() };
    };

    /** Links known entities in each segment, as the standalone transcription recorder does. */
    const enrich: TranscriptStage = async (message) => {
      const [settingsAtom] = capabilities.getAll(TranscriptionCapabilities.Settings);
      const settings = settingsAtom && registry.get(settingsAtom);
      const spaceId = store.state.activeMeeting && Obj.getDatabase(store.state.activeMeeting)?.spaceId;
      // Read per segment so a settings toggle mid-call applies.
      if (!spaceId || !(settings?.entityExtraction ?? true)) {
        return message;
      }
      const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
      const { data, error } = await invokePromise(TranscriptOperation.EnrichMessage, { message }, { spaceId });
      if (error) {
        log.warn('entity extraction failed; using raw transcript', { error });
        return message;
      }
      return data?.message ?? message;
    };

    const callSink = new TranscriptSink({ resolveTarget, stages: [enrich] });
    // A simulated call's scripted lines are written as spoken, as live transcription would, but are not enriched.
    const simulatedSink = new TranscriptSink({ resolveTarget });

    /** The meeting id last resolved from the call, so repeated call-state updates do not resolve it again. */
    let handledMeetingId: string | undefined;
    const unsubscribe = [
      callManager.transcript.on((segment) => {
        if (
          MeetingActivity.isTranscriptionEnabled(
            registry.get(callManager.activityAtom(MeetingActivity.TRANSCRIPTION_KEY)),
          )
        ) {
          const did = Option.getOrUndefined(identity.getSnapshot())?.did;
          void callSink.write(segment, { identityDid: did }).catch((error) => log.catch(error));
        }
      }),
      callManager.simulatedUtterance.on(({ speaker, text }) => {
        const started = new Date().toISOString();
        void simulatedSink
          .write({ _tag: 'transcript', started, text }, { name: speaker })
          .catch((error) => log.catch(error));
      }),
      callManager.left.on(() => {
        handledMeetingId = undefined;
        store.updateState(() => ({}));
      }),
      callManager.callStateUpdated.on((state) => {
        const payload: MeetingActivity.MeetingPayload | undefined =
          state.activities?.[MeetingActivity.meetingKey()]?.payload;
        // Every speaking flip updates call state; only a newly advertised meeting needs resolving.
        if (!payload || payload.meetingId === handledMeetingId) {
          return;
        }
        handledMeetingId = payload.meetingId;
        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
        void invokePromise(MeetingOperation.HandlePayload, { meetingId: payload.meetingId }).catch((error) =>
          log.catch(error),
        );
      }),
    ];
    // The manager outlives this module, so a reactivation would otherwise write every segment twice.
    yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe.forEach((dispose) => dispose())));
    return [];
  }),
);
