//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback, useMemo, useState, type FC } from 'react';

import { chain, createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { AIServiceEdgeClient, type AIServiceClient } from '@dxos/assistant';
import { fullyQualifiedId, getSpace } from '@dxos/client/echo';
import { DXN } from '@dxos/keys';
import { CollectionType, SpaceAction } from '@dxos/plugin-space/types';
import { useConfig } from '@dxos/react-client';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { IconButton, Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { Transcript } from './Transcript';
import { TRANSCRIPTION_PLUGIN } from '../meta';
import { summarizeTranscript } from '../transcriber';
import { type TranscriptBlock, type TranscriptType } from '../types';

// TODO(dmaretskyi): Factor out.
//  Also this conflicts with plugin automation providing the ai client via a capability. Need to reconcile.
const useAiServiceClient = (): AIServiceClient => {
  const config = useConfig();
  const endpoint = config.values.runtime?.services?.ai?.server ?? 'http://localhost:8788'; // TOOD(burdon): Standardize consts.
  return useMemo(() => new AIServiceEdgeClient({ endpoint }), [endpoint]);
};

export const TranscriptionContainer: FC<{ transcript: TranscriptType }> = ({ transcript }) => {
  const { t } = useTranslation(TRANSCRIPTION_PLUGIN);
  const edge = useEdgeClient();
  const ai = useAiServiceClient();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const attendableId = fullyQualifiedId(transcript);

  const queue = useQueue<TranscriptBlock>(edge, transcript.queue ? DXN.parse(transcript.queue) : undefined, {
    pollInterval: 1_000,
  });

  // TODO(dmaretskyi): Pending state and errors should be handled by the framework!!!
  const [isSummarizing, setIsSummarizing] = useState(false);
  const handleSummarize = useCallback(async () => {
    setIsSummarizing(true);
    try {
      // TODO(burdon): Intent.
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
    <StackItem.Content toolbar={false} classNames='relative'>
      <Toolbar.Root classNames='absolute block-start-1 inline-end-1 z-[1] is-min'>
        <IconButton
          icon='ph--subtitles--regular'
          size={5}
          disabled={isSummarizing}
          label={t(isSummarizing ? 'summarizing label' : 'summarize label')}
          onClick={handleSummarize}
        />
      </Toolbar.Root>
      <Transcript blocks={queue?.items} attendableId={attendableId} />
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
