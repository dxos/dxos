//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Database, Feed, Obj, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type * as CallManager from '@dxos/plugin-calls/CallManager';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';
import * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';
import { Message } from '@dxos/types';

import { Meeting, MeetingCapabilities, MeetingOperation } from '#types';

import { makeCallEventHandler } from './call-event-handler.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    const store = yield* MeetingCapabilities.State;
    const registry = yield* Capabilities.AtomRegistry;

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
    // Subscribed once per activation rather than per `onJoin`, since utterances only flow in a simulated call.
    const callManager = yield* Capability.get(CallsCapabilities.Manager);
    const unsubscribe = callManager.simulatedUtterance.on(
      (utterance) => void writeUtterance(utterance).catch((err) => log.catch(err)),
    );
    // The manager outlives this module, so a reactivation would otherwise write every line twice.
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));

    const activityKey = Type.getTypename(Meeting.Meeting);
    invariant(activityKey);
    return Capability.contribute(
      CallsCapabilities.EventHandler,
      makeCallEventHandler({
        store,
        activityKey,
        getMediaState: () => registry.get(callManager.stateAtom).media,
        createTranscriptionManager: () => capabilities.get(TranscriptionCapabilities.TranscriptionManagerProvider)({}),
        handlePayload: async (payload) => {
          const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
          await invokePromise(MeetingOperation.HandlePayload, payload);
        },
      }),
    );
  }),
);
