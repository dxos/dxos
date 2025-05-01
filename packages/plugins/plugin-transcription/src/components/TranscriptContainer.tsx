//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { fullyQualifiedId, getSpace } from '@dxos/client/echo';
import { useQueue } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Transcript, renderMarkdown } from './Transcript';
import { useQueueModelAdapter } from '../hooks';
import { type TranscriptBlock, type TranscriptType } from '../types';

export const TranscriptionContainer: FC<{ role: string; transcript: TranscriptType }> = ({ role, transcript }) => {
  const attendableId = fullyQualifiedId(transcript);
  const space = getSpace(transcript);
  const queue = useQueue<TranscriptBlock>(transcript.queue.dxn, { pollInterval: 1_000 });
  const model = useQueueModelAdapter(renderMarkdown, queue);

  return (
    <StackItem.Content role={role} classNames='container-max-width pli-2'>
      <Transcript attendableId={attendableId} space={space} model={model} transcript={transcript} />
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
