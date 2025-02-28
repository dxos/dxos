//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { DXN } from '@dxos/keys';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { ScrollContainer } from '@dxos/react-ui-components';
import { StackItem } from '@dxos/react-ui-stack';

import { Transcription } from './Transcription';
import { type TranscriptBlock, type TranscriptType } from '../types';
import { Button } from '@dxos/react-ui';

const TranscriptionContainer: FC<{ transcript: TranscriptType }> = ({ transcript }) => {
  const edge = useEdgeClient();
  const queue = useQueue<TranscriptBlock>(edge, transcript.queue ? DXN.parse(transcript.queue) : undefined, {
    pollInterval: 1_000,
  });

  const handleSummarize = () => {
    console.log('summarize', transcript.queue?.toString());
  };

  return (
    <StackItem.Content toolbar={true}>
      <StackItem.Heading>
        <Button onClick={handleSummarize}>Summarize</Button>
      </StackItem.Heading>
      <ScrollContainer>
        <Transcription blocks={queue?.items} />
      </ScrollContainer>
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
