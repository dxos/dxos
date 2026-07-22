//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Feed, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { CreateAtom, GraphBuilder } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';
import { SpaceState, getSpace } from '@dxos/react-client/echo';
import { linkedSegment } from '@dxos/react-ui-attention';
import { Channel, Event } from '@dxos/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { Meeting, MeetingCapabilities, MeetingOperation } from '#types';

/**
 * Atom families to derive meeting state properties.
 * Keyed by store to ensure proper caching.
 */
const activeMeetingFamily = Atom.family((store: MeetingCapabilities.MeetingStateStore) =>
  Atom.make((get) => get(store.stateAtom).activeMeeting),
);

const activeMeetingOrPlaceholderFamily = Atom.family((store: MeetingCapabilities.MeetingStateStore) =>
  Atom.make((get) => get(store.stateAtom).activeMeeting ?? ('meeting' as const)),
);

const transcriptionManagerFamily = Atom.family((store: MeetingCapabilities.MeetingStateStore) =>
  Atom.make((get) => get(store.stateAtom).transcriptionManager),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read reactively so extensions establish a dependency and heal once these capabilities
    // land (dependency modules contribute individually, not batched per wave).
    const callManagerAtom = yield* Capability.atom(CallsCapabilities.Manager);
    const meetingStateAtom = yield* Capability.atom(MeetingCapabilities.State);
    const operationInvokerAtom = yield* Capability.atom(Capabilities.OperationInvoker);

    const extensions = yield* Effect.all([
      // TODO(wittjosiah): This currently won't _start_ the call but will navigate to the correct channel.
      GraphBuilder.createTypeExtension({
        id: 'shareCallLink',
        type: Channel.Channel,
        actions: (channel, get) => {
          const space = getSpace(channel);
          const state = space && get(CreateAtom.fromObservable(space.state));
          if (!space || state !== SpaceState.SPACE_READY || space.membershipPolicy === MembershipPolicy.LOCKED) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: 'action.shareMeetingLink',
              data: Effect.fnUntraced(function* () {
                invariant(space);
                yield* Operation.invoke(SpaceOperation.GetShareLink, {
                  space,
                  target: Obj.getURI(channel),
                  copyToClipboard: true,
                });
              }),
              properties: {
                label: ['share-call-link.label', { ns: meta.profile.key }],
                icon: 'ph--share-network--regular',
              },
            },
          ]);
        },
      }),

      GraphBuilder.createTypeExtension({
        id: 'callCompanion',
        type: Channel.Channel,
        connector: (channel, get) =>
          Effect.gen(function* () {
            const [callManager] = get(callManagerAtom);
            if (!callManager) {
              return [];
            }
            const channelUri = Obj.getURI(channel);
            const joined = get(callManager.joinedAtom);
            const roomId = get(callManager.roomIdAtom);
            if (!joined || roomId !== channelUri) {
              return [];
            }

            const [store] = get(meetingStateAtom);
            if (!store) {
              return [];
            }
            const data = get(activeMeetingOrPlaceholderFamily(store));

            return [
              AppNode.makeCompanion({
                id: 'meeting',
                label: [
                  data === 'meeting' ? 'meeting-list.label' : 'meeting-companion.label',
                  { ns: meta.profile.key },
                ],
                icon: 'ph--handshake--regular',
                data,
                position: Position.first,
              }),
            ];
          }).pipe(Effect.orDie),
      }),

      GraphBuilder.createTypeExtension({
        id: 'callTranscript',
        type: Channel.Channel,
        actions: (channel, get) =>
          Effect.gen(function* () {
            const [store] = get(meetingStateAtom);
            if (!store) {
              return [];
            }
            const transcriptionManager = get(transcriptionManagerFamily(store));
            const enabled = transcriptionManager ? get(transcriptionManager.enabled) : false;
            return [
              {
                id: 'action.startStopTranscription',
                data: Effect.fnUntraced(function* () {
                  const store = yield* Capability.get(MeetingCapabilities.State);
                  let meeting = store.state.activeMeeting;
                  if (!meeting) {
                    const db = Obj.getDatabase(channel);
                    invariant(db);
                    const createResult = yield* Operation.invoke(MeetingOperation.Create, { channel });
                    const addResult = yield* Operation.invoke(SpaceOperation.AddObject, {
                      target: db,
                      object: createResult.object,
                    });
                    invariant(Obj.instanceOf(Meeting.Meeting, addResult.object));
                    yield* Operation.invoke(MeetingOperation.SetActive, { object: addResult.object });
                    meeting = addResult.object as Meeting.Meeting;
                  }

                  const callManager = yield* Capability.get(CallsCapabilities.Manager);
                  const transcript = yield* Effect.promise(() => meeting.transcript.load());
                  const transcriptFeed = yield* Effect.promise(() => transcript.feed.load());
                  const transcriptFeedUri = Feed.getFeedUri(transcriptFeed);
                  invariant(transcriptFeedUri, 'Transcript feed has no feed URI');
                  const transcriptionEnabled = !enabled;
                  callManager.setActivity(Type.getTypename(Meeting.Meeting)!, {
                    meetingId: Obj.getURI(meeting),
                    transcriptDxn: transcriptFeedUri.toString(),
                    transcriptionEnabled,
                  });

                  if (!transcriptionEnabled) {
                    log.warn('transcription disabled');
                  } else {
                    const companion = linkedSegment('transcript');
                    yield* Operation.invoke(LayoutOperation.UpdateCompanion, { subject: companion });
                  }
                }),
                properties: {
                  label: enabled
                    ? ['stop-transcription.label', { ns: meta.profile.key }]
                    : ['start-transcription.label', { ns: meta.profile.key }],
                  icon: 'ph--subtitles--regular',
                  disposition: 'toolbar',
                },
              },
            ];
          }).pipe(Effect.orDie),
        connector: (channel, get) =>
          Effect.gen(function* () {
            const [store] = get(meetingStateAtom);
            if (!store) {
              return [];
            }
            const meeting = get(activeMeetingFamily(store));
            if (!meeting) {
              return [];
            }

            return [
              AppNode.makeCompanion({
                id: 'transcript',
                label: ['transcript-companion.label', { ns: meta.profile.key }],
                icon: 'ph--subtitles--regular',
                data: get(Obj.atom(meeting.transcript)),
                position: Position.first,
              }),
            ];
          }).pipe(Effect.orDie),
      }),

      // While in this meeting's call, show the whole meeting article as a companion so the primary
      // plank can hold the call (its Call tab).
      GraphBuilder.createTypeExtension({
        id: 'meetingCallCompanion',
        type: Meeting.Meeting,
        connector: (meeting, get) =>
          Effect.gen(function* () {
            const [callManager] = get(callManagerAtom);
            if (!callManager) {
              return [];
            }
            const joined = get(callManager.joinedAtom);
            const roomId = get(callManager.roomIdAtom);
            if (!joined || roomId !== Obj.getURI(meeting)) {
              return [];
            }

            return [
              AppNode.makeCompanion({
                id: 'meeting',
                label: ['meeting-companion.label', { ns: meta.profile.key }],
                icon: 'ph--handshake--regular',
                data: meeting,
                position: Position.first,
              }),
            ];
          }).pipe(Effect.orDie),
      }),

      // Contribute meeting actions onto Event nodes (plugin-inbox stays meeting-agnostic): "Create meeting"
      // while the event has no meeting yet, otherwise "Open meeting" (where the call is started/joined).
      GraphBuilder.createTypeExtension({
        id: 'createMeetingForEvent',
        type: Event.Event,
        actions: (event, get) =>
          Effect.gen(function* () {
            const db = Obj.getDatabase(event);
            if (!db) {
              return [];
            }
            // Resolve meetings synchronously via the query atom: action callbacks run under
            // `Effect.runSync`, so an awaited query (e.g. `Meeting.getMeetingForEvent`) would die with
            // an `AsyncFiberException`. Reading the atom also makes the action reactive to new meetings.
            const meetings = get(db.query(Query.select(Filter.type(Meeting.Meeting))).atom);
            const meeting = Meeting.findMeetingForEvent(meetings, event);

            // Graph-action Effects lack `Operation.Service` in context, so `Operation.invoke` fails here;
            // call the captured `OperationInvoker` capability directly instead.
            const [invoker] = get(operationInvokerAtom);
            if (!invoker) {
              return [];
            }

            if (meeting) {
              return [
                {
                  id: 'action.openMeetingForEvent',
                  data: Effect.fnUntraced(function* () {
                    yield* invoker.invoke(LayoutOperation.Open, { subject: [Paths.getObjectPathFromObject(meeting)] });
                  }),
                  properties: {
                    label: ['open-meeting-for-event.label', { ns: meta.profile.key }],
                    icon: 'ph--handshake--regular',
                    // Surface in the Event article toolbar (not just the node context menu).
                    disposition: 'toolbar',
                  },
                },
              ];
            }
            return [
              {
                id: 'action.createMeetingForEvent',
                data: Effect.fnUntraced(function* () {
                  yield* invoker.invoke(MeetingOperation.Create, { name: event.title, event: Ref.make(event) });
                }),
                properties: {
                  label: ['create-meeting-for-event.label', { ns: meta.profile.key }],
                  icon: 'ph--handshake--regular',
                  // Surface in the Event article toolbar (not just the node context menu).
                  disposition: 'toolbar',
                },
              },
            ];
          }).pipe(Effect.orDie),
      }),
    ]);

    return Capability.provide(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
