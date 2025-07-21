//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import { type AiServiceClient } from '@dxos/ai';
import { Capabilities, contributes, createIntent, type PluginContext } from '@dxos/app-framework';
import { extractionAnthropicFn, processTranscriptMessage } from '@dxos/assistant';
import { Filter, type Obj, Query, Type } from '@dxos/echo';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { AssistantCapabilities } from '@dxos/plugin-assistant';
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
import { MeetingAction, MeetingType, type MeetingSettingsProps } from '../types';

// TODO(wittjosiah): Factor out.
// TODO(wittjosiah): Can we stop using protobuf for this?
type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;

export default (context: PluginContext) => {
  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
  const client = context.getCapability(ClientCapabilities.Client);
  const state = context.getCapability(MeetingCapabilities.State);
  const settings = context
    .getCapability(Capabilities.SettingsStore)
    .getStore<MeetingSettingsProps>(MEETING_PLUGIN)!.value;

  return contributes(ThreadCapabilities.CallExtension, {
    onJoin: async ({ channel }: { channel?: ChannelType }) => {
      const identity = client.halo.identity.get();
      invariant(identity);
      const space = getSpace(channel);
      invariant(space);

      let messageEnricher;
      const aiClient = context.getCapabilities(AssistantCapabilities.AiClient).pop();
      if (aiClient && settings.entityExtraction) {
        messageEnricher = createEntityExtractionEnricher({
          aiClient: aiClient.value,
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
      const typename = Type.getTypename(MeetingType);
      const activity = typename ? callState.activities?.[typename] : undefined;
      if (!activity?.payload) {
        return;
      }

      const payload: MeetingPayload = activity.payload;
      await dispatch(createIntent(MeetingAction.HandlePayload, payload));
    },
    onMediaStateUpdated: async ([mediaState, isSpeaking]: [MediaState, boolean]) => {
      void state.transcriptionManager?.setAudioTrack(mediaState.audioTrack);
      void state.transcriptionManager?.setRecording(isSpeaking);
    },
  });
};

type EntityExtractionEnricherFactoryOptions = {
  aiClient: AiServiceClient;
  contextTypes: Schema.Schema.AnyNoContext[];
  space: Space;
};

const createEntityExtractionEnricher = ({ aiClient, contextTypes, space }: EntityExtractionEnricherFactoryOptions) => {
  const executor = new FunctionExecutor(new ServiceContainer().setServices({ ai: { client: aiClient } }));

  return async (message: DataType.Message) => {
    const { objects } = await space.db
      .query(Query.select(Filter.or(...contextTypes.map((schema) => Filter.type(schema as Schema.Schema<Obj.Any>)))))
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
const processContextObject = async (object: Obj.Any): Promise<any> => {
  // TODO(dmaretskyi): Documents need special processing is the content is behind a ref.
  // TODO(dmaretskyi): Think about a way to handle this serialization with a decorator.
  // if (Obj.instanceOf(DocumentType, object)) {
  //   return {
  //     ...object,
  //     content: await object.content.load(),
  //   };
  // }

  return object;
};

const ENTITY_EXTRACTOR_TIMEOUT = 25_000;
