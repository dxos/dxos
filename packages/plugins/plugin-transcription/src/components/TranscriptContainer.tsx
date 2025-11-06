//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { fullyQualifiedId, getSpace } from '@dxos/client/echo';
import { useMembers, useQueue } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type Message } from '@dxos/types';

import { useQueueModelAdapter } from '../hooks';
import { type Transcript } from '../types';

import { TranscriptView, renderByline } from './Transcript';

export type TranscriptionContainerProps = {
  role: string;
  transcript: Transcript.Transcript;
};

export const TranscriptionContainer = ({ transcript }: TranscriptionContainerProps) => {
  const attendableId = fullyQualifiedId(transcript);
  const space = getSpace(transcript);
  const members = useMembers(space?.key).map((member) => member.identity);
  const queue = useQueue<Message.Message>(transcript.queue.dxn, { pollInterval: 1_000 });
  const model = useQueueModelAdapter(renderByline(members), queue);

  return (
    <StackItem.Content>
      <TranscriptView attendableId={attendableId} space={space} model={model} transcript={transcript} />
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
