//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { Capabilities, type PluginContext, contributes, createIntent, defineCapabilityModule } from '@dxos/app-framework';
import { extractionAnthropicFunction, processTranscriptMessage } from '@dxos/assistant/extraction';
import { Filter, type Obj, Query, Type } from '@dxos/echo';
import { FunctionExecutor } from '@dxos/functions-runtime';
import { ServiceContainer } from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type CallState, type MediaState, ThreadCapabilities } from '@dxos/plugin-thread';
import { type Channel } from '@dxos/plugin-thread/types';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { type buf } from '@dxos/protocols/buf';
import { type MeetingPayloadSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { type Space } from '@dxos/react-client/echo';
import { type Message } from '@dxos/types';

import { meta } from '../meta';
import { Meeting, MeetingAction } from '../types';

import { MeetingCapabilities } from './capabilities';

// TODO(wittjosiah): Factor out.
// TODO(wittjosiah): Can we stop using protobuf for this?
type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;

export default defineCapabilityModule((context: PluginContext) => {
  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
  const client = context.getCapability(ClientCapabilities.Client);
  const state = context.getCapability(MeetingCapabilities.State);
  const _settings = context.getCapability(Capabilities.SettingsStore).getStore<Meeting.Settings>(meta.id)!.value;

  return contributes(ThreadCapabilities.CallExtension, {
    onJoin: async ({ channel }: { channel?: Channel.Channel }) => {
      const identity = client.halo.identity.get();
      invariant(identity);

      // let messageEnricher;
      // if (aiClient && settings.entityExtraction) {
      //   messageEnricher = createEntityExtractionEnricher({
      //     aiClient: aiClient.value,
      //     // TODO(dmaretskyi): Have those be discovered from the schema graph or contributed by capabilities?
      //     //  This forced me to add a dependency on markdown plugin.
      //     //  This will be replaced with a vector search index anyway, so its not a big deal.
      //     contextTypes: [DocumentType, Person.Person, Organization.Organization],
      //     space,
      //   });
      // }

      // TODO(burdon): The TranscriptionManager singleton is part of the state and should just be updated here.
      state.transcriptionManager = await context
        .getCapability(TranscriptionCapabilities.TranscriptionManager)({})
        .open();
    },
    onLeave: async () => {
      await state.transcriptionManager?.close();
      state.transcriptionManager = undefined;
      state.activeMeeting = undefined;
    },
    onCallStateUpdated: async (callState: CallState) => {
      const typename = Type.getTypename(Meeting.Meeting);
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
});

type EntityExtractionEnricherFactoryOptions = {
  contextTypes: Schema.Schema.AnyNoContext[];
  space: Space;
};

const _createEntityExtractionEnricher = ({ contextTypes, space }: EntityExtractionEnricherFactoryOptions) => {
  const executor = new FunctionExecutor(new ServiceContainer());

  return async (message: Message.Message) => {
    const objects = await space.db
      .query(Query.select(Filter.or(...contextTypes.map((schema) => Filter.type(schema as Schema.Schema<Obj.Any>)))))
      .run();

    log.info('context', { objects });

    const { message: enhancedMessage, timeElapsed } = await processTranscriptMessage({
      input: {
        message,
        objects: await Promise.all(objects.map((obj) => processContextObject(obj))),
      },
      function: extractionAnthropicFunction,
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
