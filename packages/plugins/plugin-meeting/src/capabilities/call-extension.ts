//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Database, Feed, Obj, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import type * as CallManager from '@dxos/plugin-calls/CallManager';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';
import * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';
import * as TranscriptOperation from '@dxos/plugin-transcription/TranscriptOperation';
import { type buf } from '@dxos/protocols/buf';
import { type MeetingPayloadSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { Message } from '@dxos/types';

import { Meeting, MeetingCapabilities, MeetingOperation } from '#types';

// TODO(wittjosiah): Factor out.
// TODO(wittjosiah): Can we stop using protobuf for this?
type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    const store = yield* MeetingCapabilities.State;

    /** A simulated call's scripted lines go to the active meeting's transcript, as live transcription would write them. */
    const writeUtterance = async ({ speaker, text }: CallManager.SimulatedUtterance) => {
      const meeting = store.state.activeMeeting;
      const db = meeting && Obj.getDatabase(meeting);
      if (!meeting || !db) {
        return;
      }

      const transcript = await meeting.transcript.load();
      const feed = await transcript.feed.load();
      const created = new Date().toISOString();
      const message = Obj.make(Message.Message, {
        created,
        blocks: [{ _tag: 'transcript', started: created, text }],
        sender: { name: speaker },
      });
      await Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    };
    // Subscribed for the module's lifetime: utterances only flow in a simulated call, which never emits `roomJoined`.
    const callManager = yield* Capability.get(CallsCapabilities.Manager);
    const unsubscribe = callManager.simulatedUtterance.on(
      (utterance) => void writeUtterance(utterance).catch((err) => log.catch(err)),
    );
    // The manager outlives this module, so a reactivation would otherwise write every line twice.
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));

    /** Links known entities in each native transcript segment, as the standalone transcription recorder does. */
    const enrich: CallManager.TranscriptMessageEnricher = async (message) => {
      const [settingsAtom] = capabilities.getAll(TranscriptionCapabilities.Settings);
      const settings = settingsAtom && capabilities.get(Capabilities.AtomRegistry).get(settingsAtom);
      const meeting = store.state.activeMeeting;
      const spaceId = meeting && Obj.getDatabase(meeting)?.spaceId;
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

    return Capability.contribute(CallsCapabilities.EventHandler, {
      onJoin: async () => {
        callManager.setTranscriptEnricher(enrich);
      },
      onLeave: async () => {
        store.updateState(() => ({}));
      },
      onCallStateUpdated: async (callState: CallManager.CallState) => {
        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
        const typename = Type.getTypename(Meeting.Meeting);
        const activity = typename ? callState.activities?.[typename] : undefined;
        if (!activity?.payload) {
          return;
        }

        const payload: MeetingPayload = activity.payload;
        await invokePromise(MeetingOperation.HandlePayload, payload);
      },
    });
  }),
);
