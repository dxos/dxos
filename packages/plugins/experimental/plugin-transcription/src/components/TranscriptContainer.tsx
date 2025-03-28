//
// Copyright 2024 DXOS.org
//

import React, { type FC, Fragment } from 'react';

import { fullyQualifiedId } from '@dxos/client/echo';
import { DXN } from '@dxos/keys';
import { useQueue } from '@dxos/react-client/echo';
import { useEdgeClient } from '@dxos/react-edge-client';
import { StackItem } from '@dxos/react-ui-stack';

import { type TranscriptBlock, type TranscriptType } from '../types';
import { Transcript } from './Transcript';

export const TranscriptionContainer: FC<{ transcript: TranscriptType; role: string }> = ({ transcript, role }) => {
  const edge = useEdgeClient();
  const attendableId = fullyQualifiedId(transcript);

  const queue = useQueue<TranscriptBlock>(transcript.queue ? DXN.parse(transcript.queue) : undefined, {
    pollInterval: 1_000,
  });

  const Root = role === 'article' ? StackItem.Content : Fragment;
  const rootProps = role === 'article' ? { toolbar: false } : {};

  return (
    <Root {...(rootProps as any)}>
      <Transcript blocks={queue?.items} attendableId={attendableId} />
    </Root>
  );
};

export default TranscriptionContainer;
