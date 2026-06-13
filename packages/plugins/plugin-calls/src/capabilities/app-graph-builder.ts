//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Feed, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { CreateAtom, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';
import { SpaceState, getSpace } from '@dxos/react-client/echo';
import { linkedSegment } from '@dxos/react-ui-attention';
import { Channel } from '@dxos/types';

import { meta } from '#meta';
import { Call, CallOperation, CallsCapabilities } from '#types';

/**
 * Atom families to derive call record state properties.
 * Keyed by store to ensure proper caching.
 */
const activeCallFamily = Atom.family((store: CallsCapabilities.CallRecordStore) =>
  Atom.make((get) => get(store.stateAtom).activeCall),
);

const activeCallOrPlaceholderFamily = Atom.family((store: CallsCapabilities.CallRecordStore) =>
  Atom.make((get) => get(store.stateAtom).activeCall ?? ('call' as const)),
);

const transcriptionManagerFamily = Atom.family((store: CallsCapabilities.CallRecordStore) =>
  Atom.make((get) => get(store.stateAtom).transcriptionManager),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'activeCall',
        match: NodeMatcher.whenRoot,
        connector: (node, get) => {
          const callManagerAtom = capabilities.atom(CallsCapabilities.Manager);
          const [call] = get(callManagerAtom);
          if (!call) {
            return Effect.succeed([]);
          }
          // Use derived joinedAtom for efficient subscription.
          const joined = get(call.joinedAtom);
          return Effect.succeed(
            joined
              ? [
                  AppNode.makeDeckCompanion({
                    id: 'activeCall',
                    label: ['call-panel.label', { ns: meta.id }],
                    icon: 'ph--video-conference--regular',
                    data: null,
                    position: 'first',
                  }),
                ]
              : [],
          );
        },
      }),
      GraphBuilder.createTypeExtension({
        id: 'channelChatCompanion',
        type: Channel.Channel,
        connector: (channel, get) => {
          const callManagerAtom = capabilities.atom(CallsCapabilities.Manager);
          const [callManager] = get(callManagerAtom);
          if (!callManager) {
            return Effect.succeed([]);
          }
          // Use derived atoms for efficient subscription.
          const joined = get(callManager.joinedAtom);
          const roomId = get(callManager.roomIdAtom);
          const isActive = joined && roomId === Obj.getURI(channel);
          if (!isActive) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppNode.makeCompanion({
              id: 'chat',
              label: ['channel-companion.label', { ns: meta.id }],
              icon: 'ph--hash--regular',
              data: 'chat',
              position: 'first',
            }),
          ]);
        },
      }),

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
                label: ['share-call-link.label', { ns: meta.id }],
                icon: 'ph--share-network--regular',
              },
            },
          ]);
        },
      }),

      GraphBuilder.createTypeExtension({
        id: 'callCompanion',
        type: Channel.Channel,
        connector: Effect.fnUntraced(function* (channel, get) {
          const callManager = yield* Capability.get(CallsCapabilities.Manager);
          const channelUri = Obj.getURI(channel);
          const joined = get(callManager.joinedAtom);
          const roomId = get(callManager.roomIdAtom);
          if (!joined || roomId !== channelUri) {
            return [];
          }

          const store = yield* Capability.get(CallsCapabilities.RecordState);
          const data = get(activeCallOrPlaceholderFamily(store));

          return [
            AppNode.makeCompanion({
              id: 'call',
              label: [data === 'call' ? 'meeting-list.label' : 'meeting-companion.label', { ns: meta.id }],
              icon: 'ph--note--regular',
              data,
              position: 'first',
            }),
          ];
        }),
      }),

      GraphBuilder.createTypeExtension({
        id: 'callTranscript',
        type: Channel.Channel,
        actions: Effect.fnUntraced(function* (channel, get) {
          const store = yield* Capability.get(CallsCapabilities.RecordState);
          const transcriptionManager = get(transcriptionManagerFamily(store));
          const enabled = transcriptionManager ? get(transcriptionManager.enabled) : false;
          return [
            {
              id: 'action.startStopTranscription',
              data: Effect.fnUntraced(function* () {
                const store = yield* Capability.get(CallsCapabilities.RecordState);
                let call = store.state.activeCall;
                if (!call) {
                  const db = Obj.getDatabase(channel);
                  invariant(db);
                  const createResult = yield* Operation.invoke(CallOperation.Create, { channel });
                  const addResult = yield* Operation.invoke(SpaceOperation.AddObject, {
                    target: db,
                    hidden: true,
                    object: createResult.object,
                  });
                  invariant(Obj.instanceOf(Call.Call, addResult.object));
                  yield* Operation.invoke(CallOperation.SetActive, { object: addResult.object });
                  call = addResult.object;
                }

                const callManager = yield* Capability.get(CallsCapabilities.Manager);
                const transcript = yield* Effect.promise(() => call.transcript.load());
                const transcriptFeed = yield* Effect.promise(() => transcript.feed.load());
                const transcriptQueueDxn = Feed.getQueueUri(transcriptFeed);
                invariant(transcriptQueueDxn, 'Transcript feed has no queue DXN');
                const transcriptionEnabled = !enabled;
                callManager.setActivity(Type.getTypename(Call.Call)!, {
                  meetingId: Obj.getURI(call),
                  transcriptDxn: transcriptQueueDxn.toString(),
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
                  ? ['stop-transcription.label', { ns: meta.id }]
                  : ['start-transcription.label', { ns: meta.id }],
                icon: 'ph--subtitles--regular',
                disposition: 'toolbar',
              },
            },
          ];
        }),
        connector: Effect.fnUntraced(function* (channel, get) {
          const store = yield* Capability.get(CallsCapabilities.RecordState);
          const call = get(activeCallFamily(store));
          if (!call) {
            return [];
          }

          return [
            AppNode.makeCompanion({
              id: 'transcript',
              label: ['transcript-companion.label', { ns: meta.id }],
              icon: 'ph--subtitles--regular',
              data: get(Obj.atom(call.transcript)),
              position: 'first',
            }),
          ];
        }),
      }),

      GraphBuilder.createTypeExtension({
        id: 'callTranscriptCompanion',
        type: Call.Call,
        connector: (call, get) =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'transcript',
              label: ['transcript-companion.label', { ns: meta.id }],
              icon: 'ph--subtitles--regular',
              data: get(Obj.atom(call.transcript)),
              position: 'first',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
