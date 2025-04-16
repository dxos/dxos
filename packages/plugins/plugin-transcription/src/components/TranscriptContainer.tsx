//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { fullyQualifiedId } from '@dxos/client/echo';
import { useQueue } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Transcript } from './Transcript';
import { type TranscriptBlock, type TranscriptType } from '../types';

export const TranscriptionContainer: FC<{ transcript: TranscriptType; role: string }> = ({ transcript, role }) => {
  const attendableId = fullyQualifiedId(transcript);
  const queue = useQueue<TranscriptBlock>(transcript.queue.dxn, { pollInterval: 1_000 });

  return (
    <StackItem.Content role={role} classNames='container-max-width pli-2'>
      <Transcript attendableId={attendableId} blocks={queue?.items} />
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
