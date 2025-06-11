//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import { AIServiceEdgeClient, type AIServiceClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { extractionAnthropicFn, processTranscriptMessage } from '@dxos/assistant';
import { Filter, getSchemaTypename, Query, type BaseEchoObject } from '@dxos/echo-schema';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { type CallState, type MediaState, ThreadCapabilities } from '@dxos/plugin-thread';
import { type ChannelType } from '@dxos/plugin-thread/types';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { type buf } from '@dxos/protocols/buf';
import { type MeetingPayloadSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { getSpace, type Space } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { MeetingCapabilities } from './capabilities';
import { MEETING_PLUGIN } from '../meta';
import { MeetingType, type MeetingSettingsProps } from '../types';

// TODO(wittjosiah): Factor out.
// TODO(wittjosiah): Can we stop using protobuf for this?
type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;

export default (context: PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  const state = context.getCapability(MeetingCapabilities.State);
  const settings = context
    .getCapability(Capabilities.SettingsStore)
    .getStore<MeetingSettingsProps>(MEETING_PLUGIN)!.value;

  // TODO(dmaretskyi): Request via capability.
  const aiClient: AIServiceClient | undefined = new AIServiceEdgeClient({
    // TODO(burdon): Get from config.
    endpoint: AI_SERVICE_ENDPOINT.REMOTE,
  });

  return contributes(ThreadCapabilities.CallExtension, {
    onJoin: async ({ channel }: { channel?: ChannelType }) => {
      const identity = client.halo.identity.get();
      invariant(identity);
      const space = getSpace(channel);
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
      state.transcriptionManager = await context
        .getCapability(TranscriptionCapabilities.TranscriptionManager)({ messageEnricher })
        .open();
    },
    onLeave: async () => {
      await state.transcriptionManager?.close();
      state.transcriptionManager = undefined;
      state.activeMeeting = undefined;
    },
    onCallStateUpdated: async (callState: CallState) => {
      const typename = getSchemaTypename(MeetingType);
      const activity = typename ? callState.activities?.[typename] : undefined;
      if (!activity?.payload) {
        return;
      }

      const payload: MeetingPayload = activity.payload;
      const enabled = !!payload.transcriptionEnabled;
      if (payload.transcriptDxn) {
        // NOTE: Must set queue before enabling transcription.
        state.transcriptionManager?.setQueue(DXN.parse(payload.transcriptDxn));
      }
      await state.transcriptionManager?.setEnabled(enabled);
    },
    onMediaStateUpdated: async ([mediaState, isSpeaking]: [MediaState, boolean]) => {
      void state.transcriptionManager?.setAudioTrack(mediaState.audioTrack);
      void state.transcriptionManager?.setRecording(isSpeaking);
    },
  });
};

type EntityExtractionEnricherFactoryOptions = {
  aiClient: AIServiceClient;
  contextTypes: Schema.Schema.AnyNoContext[];
  space: Space;
};

const createEntityExtractionEnricher = ({ aiClient, contextTypes, space }: EntityExtractionEnricherFactoryOptions) => {
  const executor = new FunctionExecutor(new ServiceContainer().setServices({ ai: { client: aiClient } }));

  return async (message: DataType.Message) => {
    const { objects } = await space.db
      .query(Query.select(Filter.or(...contextTypes.map((s) => Filter.type(s as Schema.Schema<BaseEchoObject>)))))
      .run();

    log.info('context', { objects });

    const { message: enhancedMessage, timeElapsed } = await processTranscriptMessage({
      input: {
        message,
        objects: await Promise.all(objects.map((obj) => processContextObject(obj))),
      },
      function: extractionAnthropicFn,
      executor,
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
