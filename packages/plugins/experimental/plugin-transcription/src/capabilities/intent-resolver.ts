//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginsContext } from '@dxos/app-framework';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type SpaceId } from '@dxos/react-client/echo';
import { EdgeHttpClient } from '@dxos/react-edge-client';

import { summarizeTranscript } from '../transcriber';
import { TranscriptionAction, TranscriptType } from '../types';
import { getTimeStr, randomQueueDxn } from '../util';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TranscriptionAction.Create,
      resolve: ({ name, spaceId }) => {
        const transcript = create(TranscriptType, {
          queue: randomQueueDxn(spaceId as SpaceId).toString(),
          name: name ?? `Transcript ${getTimeStr(Date.now())}`,
        });

        return { data: { object: transcript } };
      },
    }),

    createResolver({
      intent: TranscriptionAction.Summarize,
      resolve: async ({ transcript, context: _context }) => {
        // TODO(wittjosiah): Use capability (but note that this creates a dependency on the assistant plugin being available for summarization to work).
        const client = context.requestCapability(ClientCapabilities.Client);
        const edgeUrl = client.config.values.runtime?.services?.edge?.url;
        invariant(edgeUrl, 'EDGE services not configured.');
        const edge = new EdgeHttpClient(edgeUrl);
        const endpoint = client.config.values.runtime?.services?.ai?.server;
        invariant(endpoint, 'AI service not configured.');
        const ai = new AIServiceEdgeClient({ endpoint });
        const summary = await summarizeTranscript(edge, ai, transcript, _context);
        return { data: summary };
      },
    }),
  ]);
