//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { fullyQualifiedId } from '@dxos/client/echo';
import { DXN } from '@dxos/keys';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { StackItem } from '@dxos/react-ui-stack';

import { Transcript } from './Transcript';
import { type TranscriptBlock, type TranscriptType } from '../types';

export const TranscriptionContainer: FC<{ transcript: TranscriptType; role: string }> = ({ transcript }) => {
  const edge = useEdgeClient();
  const attendableId = fullyQualifiedId(transcript);

  const queue = useQueue<TranscriptBlock>(edge, transcript.queue ? DXN.parse(transcript.queue) : undefined, {
    pollInterval: 1_000,
  });

  return (
    // TODO(wittjosiah): h-full probably shouldn't be needed. Currently needed to render within a meeting.
    <StackItem.Content toolbar={false} classNames='h-full'>
      <Transcript blocks={queue?.items} attendableId={attendableId} />
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
