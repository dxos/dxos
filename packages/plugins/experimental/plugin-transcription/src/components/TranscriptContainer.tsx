//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { DXN } from '@dxos/keys';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { ScrollContainer } from '@dxos/react-ui-components';
import { StackItem } from '@dxos/react-ui-stack';

import { Transcript } from './Transcript';
import { type TranscriptBlock, type TranscriptType } from '../types';

export const TranscriptionContainer: FC<{ transcript: TranscriptType }> = ({ transcript }) => {
  const edge = useEdgeClient();
  const queue = useQueue<TranscriptBlock>(edge, transcript.queue ? DXN.parse(transcript.queue) : undefined, {
    pollInterval: 1_000,
  });

  return (
    <StackItem.Content toolbar={false}>
      <ScrollContainer>
        <Transcript blocks={queue?.items} />
      </ScrollContainer>
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
