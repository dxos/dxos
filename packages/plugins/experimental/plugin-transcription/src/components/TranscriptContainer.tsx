//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback, useMemo, useState, type FC } from 'react';

import { chain, createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { Message } from '@dxos/artifact';
import { AIServiceEdgeClient, DEFAULT_LLM_MODEL, MixedStreamParser, type AIServiceClient } from '@dxos/assistant';
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
import { IconButton, Toolbar, useTranslation } from '@dxos/react-ui';
import { ScrollContainer } from '@dxos/react-ui-components';
import { StackItem } from '@dxos/react-ui-stack';
import { TextType } from '@dxos/schema';

import { Transcript } from './Transcript';
import { TRANSCRIPTION_PLUGIN } from '../meta';
import { TranscriptBlock, type TranscriptType } from '../types';

export const TranscriptionContainer: FC<{ transcript: TranscriptType }> = ({ transcript }) => {
  const { t } = useTranslation(TRANSCRIPTION_PLUGIN);
  const edge = useEdgeClient();
  const ai = useAiServiceClient();
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const queue = useQueue<TranscriptBlock>(edge, transcript.queue ? DXN.parse(transcript.queue) : undefined, {
    pollInterval: 1_000,
  });

  // TODO(dmaretskyi): Pending state and errors should be handled by the framework!!!
  const [isSummarizing, setIsSummarizing] = useState(false);
  const handleSummarize = useCallback(async () => {
    setIsSummarizing(true);
    try {
      const document = await summarizeTranscript(edge, ai, transcript);
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

  // TODO(dmaretskyi): Move action to menu.
  return (
    <StackItem.Content toolbar={true}>
      <StackItem.Heading>
        <Toolbar.Root classNames='flex gap-2'>
          <IconButton
            icon='ph--subtitles--regular'
            iconOnly
            size={5}
            disabled={isSummarizing}
            onClick={handleSummarize}
            label={t('summary button')}
          />
          {isSummarizing && <div className='text-sm'>{t('summarizing label')}</div>}
        </Toolbar.Root>
      </StackItem.Heading>
      <ScrollContainer>
        <Transcript blocks={queue?.items} />
      </ScrollContainer>
    </StackItem.Content>
  );
};

export default TranscriptionContainer;

// TODO(dmaretskyi): Extract to the new file once transcript refactoring has settled.
const summarizeTranscript = async (edge: EdgeHttpClient, ai: AIServiceClient, transcript: TranscriptType) => {
  invariant(transcript.queue, 'No queue found for transcript');

  const queue = new QueueImpl(edge, DXN.parse(transcript.queue));
  await queue.refresh();
  const content = queue.items
    .filter((block) => isInstanceOf(TranscriptBlock, block))
    .map((block) => `${block.author}: ${block.segments.map((segment) => segment.text).join('\n')}`)
    .join('\n\n');

  const parser = new MixedStreamParser();

  log.info('summarizing transcript', { blockCount: queue.items.length });
  const output = await parser.parse(
    await ai.exec({
      model: DEFAULT_LLM_MODEL,
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
  # Goal
  Create a markdown summary of the transcript provided.

  # Formatting
  - Format the summary as a markdown document without extra comments like "Here is the summary of the transcript:".
  - Use markdown formatting for headings and bullet points.
  - Format the summary as a list of key points and takeaways.
  - All names of people should be in bold.

  # Note Taking
  - Correlate items in the summary with the person of origin to build a coherent narrative.
  - Include short quotes verbatim where appropriate. Especially when concerned with design decisions and problem descriptions.

  # Tasks
  At the end of the summary include tasks.
  Extract only the tasks that are:
  - Directly actionable.
  - Clearly assigned to a person or team (or can easily be inferred).
  - Strongly implied by the conversation and/or user note (no speculative tasks).
  - Specific enough that someone reading them would know exactly what to do next.

  Format all tasks as markdown checkboxes using the syntax:
  - [ ] Task description

  Additional information can be included (indented).

  If no actionable tasks are found, omit this tasks section.
`;

// TODO(dmaretskyi): Extract?
//  Also this conflicts with plugin automation providing the ai client via a capability. Need to reconcile.
const useAiServiceClient = (): AIServiceClient => {
  const config = useConfig();
  const endpoint = config.values.runtime?.services?.ai?.server ?? 'http://localhost:8788'; // TOOD(burdon): Standardize consts.
  return useMemo(() => new AIServiceEdgeClient({ endpoint }), [endpoint]);
};
