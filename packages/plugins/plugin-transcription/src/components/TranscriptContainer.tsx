//
// Copyright 2024 DXOS.org
//

import React, { useCallback, type FC } from 'react';

import { fullyQualifiedId, getSpace } from '@dxos/client/echo';
import { useMembers, useQueue } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Transcript } from './Transcript';
import { useQueueModelAdapter } from '../hooks';
import { type TranscriptBlock, type TranscriptType } from '../types';

export const TranscriptionContainer: FC<{ role: string; transcript: TranscriptType }> = ({ role, transcript }) => {
  const attendableId = fullyQualifiedId(transcript);
  const space = getSpace(transcript);
  const members = useMembers(space?.key);
  const queue = useQueue<TranscriptBlock>(transcript.queue.dxn, { pollInterval: 1_000 });

  const renderMarkdown = useCallback(
    (block: TranscriptBlock, debug = false): string[] => {
      // TODO(burdon): Use link/reference markup for users (with popover).
      // TODO(burdon): Color and avatar.
      const identity = members.find((member) => member.identity.did === block.identityDid);
      const name = identity?.identity.profile?.displayName ?? `\`${block.identityDid}\``;
      return [
        `###### ${name}` + (debug ? ` (${block.id})` : ''),
        block.segments.map((segment) => segment.text.trim()).join(' '),
        '',
      ];
    },
    [members],
  );

  const model = useQueueModelAdapter(renderMarkdown, queue);

  return (
    <StackItem.Content role={role} classNames='container-max-width pli-2'>
      <Transcript attendableId={attendableId} space={space} model={model} transcript={transcript} />
    </StackItem.Content>
  );
};

export default TranscriptionContainer;
