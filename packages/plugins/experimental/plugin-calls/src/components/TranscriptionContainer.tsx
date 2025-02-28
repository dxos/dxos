//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback, useMemo, useState, type FC } from 'react';

import { chain, createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { Message } from '@dxos/artifact';
import { type AIServiceClient, AIServiceClientImpl, MixedStreamParser } from '@dxos/assistant';
import { create, getSpace, makeRef } from '@dxos/client/echo';
import { QueueImpl } from '@dxos/echo-db';
import { createStatic, isInstanceOf } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { CollectionType, SpaceAction } from '@dxos/plugin-space/types';
import { useConfig } from '@dxos/react-client';
import { useEdgeClient, useQueue, type EdgeHttpClient } from '@dxos/react-edge-client';
import { Button } from '@dxos/react-ui';
import { ScrollContainer } from '@dxos/react-ui-components';
import { StackItem } from '@dxos/react-ui-stack';
import { TextType } from '@dxos/schema';

import { Transcription } from './Transcription';
import { TranscriptBlock, type TranscriptType } from '../types';

const TranscriptionContainer: FC<{ transcript: TranscriptType }> = ({ transcript }) => {
  const edge = useEdgeClient();
  const aiService = useAiServiceClient();
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const queue = useQueue<TranscriptBlock>(edge, transcript.queue ? DXN.parse(transcript.queue) : undefined, {
    pollInterval: 1_000,
  });

  // TODO(dmaretskyi): Pending state and errors should be handled by the framework!!!
  const [isSummarizing, setIsSummarizing] = useState(false);
  const handleSummarize = useCallback(async () => {
    setIsSummarizing(true);
    try {
      const document = await summarizeTranscript(edge, aiService, transcript);
      const space = getSpace(transcript);
      const target = space?.properties[CollectionType.typename]?.target;
      await dispatch(
        pipe(
          createIntent(SpaceAction.AddObject, { object: document, target }),
          chain(LayoutAction.Open, { part: 'main' }),
        ),
      );
    } finally {
      setIsSummarizing(false);
    }
  }, [transcript, edge]);

  // TODO(dmaretskyi): Move action to deck?
  return (
    <StackItem.Content toolbar={true}>
      <StackItem.Heading>
        <Button onClick={handleSummarize} disabled={isSummarizing}>
          {isSummarizing ? 'Summarizing...' : 'Summarize'}
        </Button>
      </StackItem.Heading>
      <ScrollContainer>
        <Transcription blocks={queue?.items} />
      </ScrollContainer>
    </StackItem.Content>
  );
};

export default TranscriptionContainer;

// TODO(dmaretskyi): Extract to the new file once transcript refactoring has settled.
const summarizeTranscript = async (
  edgeClient: EdgeHttpClient,
  aiService: AIServiceClient,
  transcript: TranscriptType,
) => {
  invariant(transcript.queue, 'No queue found for transcript');

  const queue = new QueueImpl(edgeClient, DXN.parse(transcript.queue));
  await queue.refresh();
  const content = queue.items
    .filter((block) => isInstanceOf(TranscriptBlock, block))
    .map((block) => `${block.author}: ${block.segments.map((segment) => segment.text).join('\n')}`)
    .join('\n\n');

  const parser = new MixedStreamParser();

  log.info('summarizing transcript', { blockCount: queue.items.length });
  const output = await parser.parse(
    await aiService.generate({
      model: '@anthropic/claude-3-5-sonnet-20241022',
      systemPrompt: SUMMARIZE_PROMPT,
      history: [createStatic(Message, { role: 'user', content: [{ type: 'text', text: content }] })],
    }),
  );

  log.info('transcript summary', { output });
  invariant(output[0].content[0].type === 'text', 'Expected text content');
  const summary = output[0].content[0].text;

  // TODO(dmaretskyi): .started is missing.
  const name = `Summary ${(transcript.started ?? new Date()).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
  return create(DocumentType, {
    name,
    content: makeRef(create(TextType, { content: summary })),
    threads: [],
  });
};

// TODO(dmaretskyi): Add example to set consistent structure for the summary.
const SUMMARIZE_PROMPT = `
  Create a summary of the transcript provided.
  Reference specific people by name when possible.
  Format the summary as a list of key points and takeaways.
  Include action items in the summary.
  Use markdown formatting for headings and bullet points.
  Format the summary as a markdown document without extra comments like "Here is the summary of the transcript:".
`;

// TODO(dmaretskyi): Extract?
//                   Also this conflicts with plugin automation providing the ai client via a capability. Need to reconcile.
const useAiServiceClient = (): AIServiceClient => {
  const config = useConfig();
  const endpoint = config.values.runtime?.services?.ai?.server ?? 'http://localhost:8788';
  return useMemo(() => new AIServiceClientImpl({ endpoint }), [endpoint]);
};
