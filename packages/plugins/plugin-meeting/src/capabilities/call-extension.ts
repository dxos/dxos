//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type CallState, type TranscriptEvent } from '@dxos/plugin-calls';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { ClientCapabilities } from '@dxos/plugin-client';
import { TranscriptionCapabilities, TranscriptOperation } from '@dxos/plugin-transcription/types';
import { type buf } from '@dxos/protocols/buf';
import { type MeetingPayloadSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { getSpace } from '@dxos/react-client/echo';
import { type Channel } from '@dxos/types';

import { Meeting, MeetingCapabilities, MeetingOperation } from '#types';

// TODO(wittjosiah): Factor out.
// TODO(wittjosiah): Can we stop using protobuf for this?
type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    const store = capabilities.get(MeetingCapabilities.State);

    return Capability.contributes(CallsCapabilities.EventHandler, {
      onJoin: async ({ channel }: { channel?: Channel.Channel }) => {
        const client = capabilities.get(ClientCapabilities.Client);
        const identity = client.halo.identity.get();
        invariant(identity);

        // Enrich native RealtimeKit segments with entity extraction (parity with the standalone
        // TranscriptionArticle recorder) so meeting transcripts link known entities. Runs headless in the
        // call-scoped manager; `EnrichMessage` needs the meeting space for its AiService/Database services.
        const spaceId = channel ? getSpace(channel)?.id : undefined;
        let messageEnricher: TranscriptionCapabilities.TranscriptMessageEnricher | undefined;
        if (spaceId) {
          const settings = capabilities.get(TranscriptionCapabilities.Settings);
          const registry = capabilities.get(Capabilities.AtomRegistry);
          const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
          messageEnricher = async (message) => {
            // Read the flag per-segment so a mid-call settings toggle takes effect. Fall back to the raw
            // message when extraction fails (e.g. AI service unavailable).
            if (!(registry.get(settings)?.entityExtraction ?? true)) {
              return message;
            }
            const { data, error } = await invokePromise(TranscriptOperation.EnrichMessage, { message }, { spaceId });
            if (error) {
              log.warn('entity extraction failed; using raw transcript', { error });
              return message;
            }
            return data?.message ?? message;
          };
        }

        // TODO(burdon): The TranscriptionManager singleton is part of the state and should just be updated here.
        const transcriptionManager = await capabilities
          .get(TranscriptionCapabilities.TranscriptionManagerProvider)({ messageEnricher })
          .open();
        store.updateState((current) => ({ ...current, transcriptionManager }));
      },
      onLeave: async () => {
        const { transcriptionManager } = store.state;
        await transcriptionManager?.close();
        store.updateState(() => ({}));
      },
      onCallStateUpdated: async (callState: CallState) => {
        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
        const typename = Type.getTypename(Meeting.Meeting);
        const activity = typename ? callState.activities?.[typename] : undefined;
        if (!activity?.payload) {
          return;
        }

        const payload: MeetingPayload = activity.payload;
        await invokePromise(MeetingOperation.HandlePayload, payload);
      },
      onTranscript: async (event: TranscriptEvent) => {
        // Native RealtimeKit transcription: CallManager forwards only this client's own segments,
        // so each is written to the shared feed exactly once (no central writer election needed).
        const { transcriptionManager } = store.state;
        await transcriptionManager?.addTranscript([
          {
            _tag: 'transcript',
            started: event.started ?? new Date().toISOString(),
            text: event.text,
            pending: event.pending,
          },
        ]);
      },
    });
  }),
);
