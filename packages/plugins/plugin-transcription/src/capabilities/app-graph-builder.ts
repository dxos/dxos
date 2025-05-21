//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe, type Schema } from 'effect';

import { Capabilities, contributes, createIntent, type PluginContext } from '@dxos/app-framework';
import { AIServiceEdgeClient, type AIServiceClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { Filter, fullyQualifiedId, getSpace, makeRef, Query, type Space } from '@dxos/client/echo';
import { getSchemaTypename, isInstanceOf, type BaseEchoObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, rxFromSignal } from '@dxos/plugin-graph';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { MeetingCapabilities, type CallState, type MediaState } from '@dxos/plugin-meeting';
import { MeetingType, type MeetingCallProperties } from '@dxos/plugin-meeting/types';
import { type buf } from '@dxos/protocols/buf';
import { type TranscriptionPayloadSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { DataType } from '@dxos/schema';

import { TranscriptionCapabilities } from './capabilities';
import { processTranscriptMessage } from '../entity-extraction';
import { TRANSCRIPTION_PLUGIN } from '../meta';
import { TranscriptionManager } from '../transcriber';
import { TranscriptionAction, type TranscriptionSettingsProps, TranscriptType } from '../types';

// TODO(wittjosiah): Factor out.
// TODO(wittjosiah): Can we stop using protobuf for this?
type TranscriptionPayload = buf.MessageInitShape<typeof TranscriptionPayloadSchema>;

const getMeetingTranscript = async (
  context: PluginContext,
  meeting: MeetingType,
): Promise<TranscriptType | undefined> => {
  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);

  const typename = getSchemaTypename(TranscriptType)!;
  const existing = await meeting.artifacts[typename]?.load();
  if (existing instanceof TranscriptType) {
    return existing;
  }

  const space = getSpace(meeting);
  invariant(space);
  const { data } = await dispatch(createIntent(TranscriptionAction.Create, { spaceId: space.id }));
  meeting.artifacts[typename] = makeRef(data!.object);
  return data?.object;
};

// TODO(wittjosiah): Introduce a sound that plays when transcription is activated/deactivated.
export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${TRANSCRIPTION_PLUGIN}/meeting-transcript`,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (isInstanceOf(MeetingType, node.data) ? Option.some(node.data) : Option.none())),
            Option.map((meeting) => {
              const state = context.getCapability(TranscriptionCapabilities.MeetingTranscriptionState);
              const enabled = get(rxFromSignal(() => state.enabled));
              return [
                {
                  id: `${fullyQualifiedId(meeting)}/action/start-stop-transcription`,
                  data: async () => {
                    // NOTE: We are not saving the state of the transcription manager here.
                    // We expect the state to be updated through `onCallStateUpdated` once it is propagated through Swarm.
                    // This is done to avoid race conditions and to not handle optimistic updates.
                    const transcript = await getMeetingTranscript(context, meeting);
                    invariant(transcript, 'Failed to create transcript');

                    const callManager = context.getCapability(MeetingCapabilities.CallManager);
                    callManager.setActivity(getSchemaTypename(TranscriptType)!, {
                      queueDxn: transcript.queue.dxn.toString(),
                      enabled: !enabled,
                    });
                  },
                  properties: {
                    label: enabled
                      ? ['stop transcription label', { ns: TRANSCRIPTION_PLUGIN }]
                      : ['start transcription label', { ns: TRANSCRIPTION_PLUGIN }],
                    icon: 'ph--subtitles--regular',
                    disposition: 'toolbar',
                    classNames: enabled ? 'bg-callAlert' : '',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (isInstanceOf(MeetingType, node.data) ? Option.some(node.data) : Option.none())),
            Option.map((meeting) => {
              const client = context.getCapability(ClientCapabilities.Client);
              const state = context.getCapability(TranscriptionCapabilities.MeetingTranscriptionState);
              const settingsStore = get(context.capabilities(Capabilities.SettingsStore))[0];
              const settings = get(
                rxFromSignal(() => settingsStore?.getStore<TranscriptionSettingsProps>(TRANSCRIPTION_PLUGIN)!.value),
              );

              // TODO(dmaretskyi): Request via capability.
              const aiClient: AIServiceClient | undefined = new AIServiceEdgeClient({
                // TODO(burdon): Get from config.
                endpoint: AI_SERVICE_ENDPOINT.REMOTE,
              });

              return [
                {
                  id: `${fullyQualifiedId(meeting)}${ATTENDABLE_PATH_SEPARATOR}${getSchemaTypename(TranscriptType)}`,
                  type: PLANK_COMPANION_TYPE,
                  data: get(rxFromSignal(() => meeting.artifacts[getSchemaTypename(TranscriptType)!]?.target)),
                  properties: {
                    label: ['transcript companion label', { ns: TRANSCRIPTION_PLUGIN }],
                    icon: 'ph--subtitles--regular',
                    position: 'hoist',
                    disposition: 'hidden',
                    schema: TranscriptType,
                    getIntent: ({ space }: { space: Space }) =>
                      createIntent(TranscriptionAction.Create, { spaceId: space.id }),

                    // TODO(burdon): Is this the right place to inisitalize the state? Change to a capability?
                    onJoin: async ({ meeting }: { meeting?: MeetingType }) => {
                      const identity = client.halo.identity.get();
                      invariant(identity);
                      const space = getSpace(meeting);
                      invariant(space);

                      let messageEnricher;
                      if (aiClient && settings.entityExtraction) {
                        messageEnricher = createEntityExtractionEnricher({
                          aiClient,
                          // TODO(dmaretskyi): Have those be discovered from the schema graph or contributed by capabilities?
                          //  This forced me to add a dependency on markdown plugin.
                          //  This will be replaced with a vector search index anyway, so its not a big deal.
                          contextTypes: [DocumentType, DataType.Person, DataType.Organization],
                          space,
                        });
                      }

                      // TODO(burdon): The TranscriptionManager singleton is part of the state and should just be updated here.
                      state.transcriptionManager = await new TranscriptionManager({
                        edgeClient: client.edge,
                        messageEnricher,
                      })
                        .setIdentityDid(identity.did)
                        .open();
                    },
                    onLeave: async () => {
                      await state.transcriptionManager?.close();
                      state.transcriptionManager = undefined;
                      state.enabled = false;
                    },
                    onCallStateUpdated: async (callState: CallState) => {
                      const typename = getSchemaTypename(TranscriptType);
                      const transcription = typename ? callState.activities?.[typename] : undefined;
                      if (!transcription?.payload) {
                        return;
                      }

                      const payload: TranscriptionPayload = transcription.payload;
                      state.enabled = !!payload.enabled;
                      if (payload.queueDxn) {
                        // NOTE: Must set queue before enabling transcription.
                        state.transcriptionManager?.setQueue(DXN.parse(payload.queueDxn));
                      }
                      await state.transcriptionManager?.setEnabled(payload.enabled);
                    },
                    onMediaStateUpdated: async ([mediaState, isSpeaking]: [MediaState, boolean]) => {
                      void state.transcriptionManager?.setAudioTrack(mediaState.audioTrack);
                      void state.transcriptionManager?.setRecording(isSpeaking);
                    },
                  } satisfies MeetingCallProperties,
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);

type EntityExtractionEnricherFactoryOptions = {
  aiClient: AIServiceClient;
  contextTypes: Schema.Schema.AnyNoContext[];
  space: Space;
};

const createEntityExtractionEnricher = ({ aiClient, contextTypes, space }: EntityExtractionEnricherFactoryOptions) => {
  return async (message: DataType.Message) => {
    const { objects } = await space.db
      .query(Query.select(Filter.or(...contextTypes.map((s) => Filter.type(s as Schema.Schema<BaseEchoObject>)))))
      .run();
    log.info('context', { objects });

    const { message: enhancedMessage, timeElapsed } = await processTranscriptMessage({
      aiService: aiClient,
      message,
      context: {
        objects: await Promise.all(objects.map((o) => processContextObject(o))),
      },
      options: { timeout: ENTITY_EXTRACTOR_TIMEOUT, fallbackToRaw: true },
    });

    log.info('entity extraction time', { timeElapsed });
    return enhancedMessage;
  };
};

// TODO(dmaretskyi): Use Type.Any
const processContextObject = async (object: BaseEchoObject): Promise<any> => {
  // TODO(dmaretskyi): Documents need special processing is the content is behind a ref.
  // TODO(dmaretskyi): Think about a way to handle this serialization with a decorator.
  // if (isInstanceOf(DocumentType, object)) {
  //   return {
  //     ...object,
  //     content: await object.content.load(),
  //   };
  // }

  return object;
};

const ENTITY_EXTRACTOR_TIMEOUT = 25_000;
