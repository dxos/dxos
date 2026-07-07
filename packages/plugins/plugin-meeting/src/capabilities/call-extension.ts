//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type CallState, type TranscriptMessageEnricher } from '@dxos/plugin-calls';
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
        // TranscriptionArticle recorder) so meeting transcripts link known entities. Runs headless inside
        // CallManager's transcript sink; `EnrichMessage` needs the meeting space for its AiService/Database.
        const spaceId = channel ? getSpace(channel)?.id : undefined;
        let messageEnricher: TranscriptMessageEnricher | undefined;
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

        capabilities.get(CallsCapabilities.Manager).setTranscriptEnricher(messageEnricher);
      },
      onLeave: async () => {
        // Stop advertising the transcript feed so the standalone article shows its mic button again.
        const { transcriptFeedUri } = store.state;
        if (transcriptFeedUri) {
          const registry = capabilities.get(Capabilities.AtomRegistry);
          const managedFeeds = capabilities.get(TranscriptionCapabilities.ManagedFeeds);
          const next = new Set(registry.get(managedFeeds));
          next.delete(transcriptFeedUri);
          registry.set(managedFeeds, next);
        }
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
    });
  }),
);
