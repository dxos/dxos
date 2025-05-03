//
// Copyright 2025 DXOS.org
//

import type { Schema } from 'effect';

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { AIServiceEdgeClient, type AIServiceClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT, Contact, Organization } from '@dxos/assistant/testing';
import { Filter, fullyQualifiedId, getSpace, makeRef, type Space } from '@dxos/client/echo';
import { getSchemaTypename, isInstanceOf, type BaseEchoObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { MeetingCapabilities, type CallState, type MediaState } from '@dxos/plugin-meeting';
import { MeetingType, type MeetingCallProperties } from '@dxos/plugin-meeting/types';
import { type buf } from '@dxos/protocols/buf';
import { type TranscriptionPayloadSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import type { MessageType } from '@dxos/schema';

import { TranscriptionCapabilities } from './capabilities';
import { processTranscriptMessage } from '../entity-extraction';
import { TRANSCRIPTION_PLUGIN } from '../meta';
import { TranscriptionManager } from '../transcriber';
import { TranscriptionAction, TranscriptType } from '../types';

// TODO(wittjosiah): Factor out.
// TODO(wittjosiah): Can we stop using protobuf for this?
type TranscriptionPayload = buf.MessageInitShape<typeof TranscriptionPayloadSchema>;

const getMeetingTranscript = async (
  context: PluginsContext,
  meeting: MeetingType,
): Promise<TranscriptType | undefined> => {
  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);

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
export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${TRANSCRIPTION_PLUGIN}/meeting-transcript`,
      filter: (node): node is Node<MeetingType> => isInstanceOf(MeetingType, node.data),
      actions: ({ node }) => {
        const meeting = node.data;
        const state = context.requestCapability(TranscriptionCapabilities.MeetingTranscriptionState);
        return [
          {
            id: `${fullyQualifiedId(meeting)}/action/start-stop-transcription`,
            data: async () => {
              // NOTE: We are not saving the state of the transcription manager here.
              // We expect the state to be updated through `onCallStateUpdated` once it is propagated through Swarm.
              // This is done to avoid race conditions and to not handle optimistic updates.
              const transcript = await getMeetingTranscript(context, meeting);
              invariant(transcript, 'Failed to create transcript');

              const call = context.requestCapability(MeetingCapabilities.CallManager);
              call.setActivity(getSchemaTypename(TranscriptType)!, {
                enabled: !state.enabled,
                queueDxn: transcript.queue.dxn.toString(),
              });
            },
            properties: {
              label: state.enabled
                ? ['stop transcription label', { ns: TRANSCRIPTION_PLUGIN }]
                : ['start transcription label', { ns: TRANSCRIPTION_PLUGIN }],
              icon: 'ph--subtitles--regular',
              disposition: 'toolbar',
              classNames: state.enabled ? 'bg-callAlert' : '',
            },
          },
        ];
      },
      connector: ({ node }) => {
        const meeting = node.data;
        const client = context.requestCapability(ClientCapabilities.Client);
        const state = context.requestCapability(TranscriptionCapabilities.MeetingTranscriptionState);

        // TODO(dmaretskyi): Request via capability.
        const aiClient: AIServiceClient | undefined = new AIServiceEdgeClient({
          endpoint: AI_SERVICE_ENDPOINT.REMOTE,
        });

        return [
          {
            id: `${fullyQualifiedId(meeting)}${ATTENDABLE_PATH_SEPARATOR}${getSchemaTypename(TranscriptType)}`,
            type: PLANK_COMPANION_TYPE,
            data: meeting.artifacts[getSchemaTypename(TranscriptType)!]?.target,
            properties: {
              label: ['transcript companion label', { ns: TRANSCRIPTION_PLUGIN }],
              icon: 'ph--subtitles--regular',
              position: 'hoist',
              disposition: 'hidden',
              schema: TranscriptType,
              getIntent: ({ space }: { space: Space }) =>
                createIntent(TranscriptionAction.Create, { spaceId: space.id }),

              // TODO(burdon): Is this the right place to inisitalize the state? Change to a capability?
              onJoin: async ({ meeting }: { meeting: MeetingType; roomId: string }) => {
                const space = getSpace(meeting);
                invariant(space);

                const entityExtractionEnricher = !aiClient
                  ? undefined
                  : createEntityExtractionEnricher({
                      aiClient,
                      space,
                      // TODO(dmaretskyi): Have those be discovered from the schema graph or contributed by capabilities?
                      //  This forced me to add a dependency on markdown plugin.
                      //  This will be replaced with a vector search index anyway, so its not a big deal.
                      contextTypes: [Contact, Organization, DocumentType],
                    });

                // TODO(burdon): The TranscriptionManager singleton is part of the state and should just be updated here.
                const transcriptionManager = new TranscriptionManager({
                  edgeClient: client.edge,
                  messageEnricher: entityExtractionEnricher,
                });

                const identity = client.halo.identity.get();
                invariant(identity);
                transcriptionManager.setIdentityDid(identity.did);

                await transcriptionManager.open();
                state.transcriptionManager = transcriptionManager;
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
      },
    }),
  ]);

type EntityExtractionEnricherFactoryOptions = {
  aiClient: AIServiceClient;
  space: Space;
  contextTypes: Schema.Schema.AnyNoContext[];
};

const createEntityExtractionEnricher = ({ aiClient, space, contextTypes }: EntityExtractionEnricherFactoryOptions) => {
  return async (message: MessageType) => {
    const { objects } = await space.db.query(Filter.or(...contextTypes.map((s) => Filter.schema(s)))).run();
    log.info('context', { objects });

    const { message: enhancedMessage, timeElapsed } = await processTranscriptMessage({
      message,
      aiService: aiClient,
      context: { objects: await Promise.all(objects.map(processContextObject)) },
      options: { timeout: ENTITY_EXTRACTOR_TIMEOUT, fallbackToRaw: true },
    });
    log.info('entity extraction time', { timeElapsed });
    return enhancedMessage;
  };
};

const processContextObject = async (object: BaseEchoObject): Promise<any> => {
  // TODO(dmaretskyi): Documents need special processing is the content is behind a ref.
  // TODO(dmaretskyi): Think about a way to handle this serialization with a decorator.
  if (isInstanceOf(DocumentType, object)) {
    return {
      ...object,
      content: await object.content.load(),
    };
  }

  return object;
};

const ENTITY_EXTRACTOR_TIMEOUT = 25_000;
