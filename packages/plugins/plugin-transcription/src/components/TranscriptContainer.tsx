//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { useMembers, useQueue } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type Message, type Transcript } from '@dxos/types';

import { useQueueModelAdapter } from '../hooks';
import { renderByline } from '../util';

import { TranscriptView } from './Transcript';

export type TranscriptionContainerProps = {
  role: string;
  transcript: Transcript.Transcript;
};

export const TranscriptionContainer = ({ transcript }: TranscriptionContainerProps) => {
  const attendableId = Obj.getDXN(transcript).toString();
  const db = Obj.getDatabase(transcript);
  const members = useMembers(db?.spaceId).map((member) => member.identity);
  const queue = useQueue<Message.Message>(transcript.queue.dxn, { pollInterval: 1_000 });
  const model = useQueueModelAdapter(renderByline(members), queue);

  return (
    <StackItem.Content>
      <TranscriptView attendableId={attendableId} model={model} transcript={transcript} />
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
