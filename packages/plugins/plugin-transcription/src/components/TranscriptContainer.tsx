//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { useMembers, useQueue } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type Message, type Transcript } from '@dxos/types';

import { useQueueModelAdapter } from '../hooks';

import { TranscriptView, renderByline } from './Transcript';

export type TranscriptionContainerProps = {
  role: string;
  transcript: Transcript.Transcript;
};

export const TranscriptionContainer = ({ transcript }: TranscriptionContainerProps) => {
  const attendableId = Obj.getDXN(transcript).toString();
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
