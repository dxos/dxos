//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { fullyQualifiedId, getSpace } from '@dxos/client/echo';
import { useMembers, useQueue } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { Transcript, renderMarkdown } from './Transcript';
import { useQueueModelAdapter } from '../hooks';
import { type TranscriptType } from '../types';

export const TranscriptionContainer: FC<{ role: string; transcript: TranscriptType }> = ({ role, transcript }) => {
  const attendableId = fullyQualifiedId(transcript);
  const space = getSpace(transcript);
  const members = useMembers(space?.key).map((member) => member.identity);
  const queue = useQueue<DataType.Message>(transcript.queue.dxn, { pollInterval: 1_000 });
  const model = useQueueModelAdapter(renderMarkdown(members), queue);

  return (
    <StackItem.Content role={role} classNames='container-max-width pli-2'>
      <Transcript attendableId={attendableId} space={space} model={model} transcript={transcript} />
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
