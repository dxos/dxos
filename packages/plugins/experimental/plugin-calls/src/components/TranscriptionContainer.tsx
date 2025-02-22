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

const TranscriptionContainer: FC<{ transcript: TranscriptType }> = ({ transcript }) => {
  const edge = useEdgeClient();
  const queue = useQueue<TranscriptBlock>(
    edge, //
    transcript.queue ? DXN.parse(transcript.queue) : undefined,
    { pollInterval: 5_00 },
  );

  return (
    <StackItem.Content toolbar={false}>
      <ScrollContainer>
        <Transcription blocks={queue?.items} />
      </ScrollContainer>
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
