//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Progress, StatusRoll } from '@dxos/react-ui-components';

import { useExecutionGraph } from '../../hooks';
import { type Assistant } from '../../types';

export type ChatProgressProps = {
  chat: Assistant.Chat;
};

// TODO(burdon): Show after delay.
// TODO(burdon): Test with errors.
export const ChatProgress = ({ chat }: ChatProgressProps) => {
  const { commits } = useExecutionGraph(chat.traceQueue);
  const nodes = useMemo(() => commits.map((commit) => ({ id: commit.id, message: commit.message })), [commits]);
  const lines = useMemo(() => commits.map((commit) => commit.message), [commits]);
  console.log(commits);

  return (
    <div className='flex flex-col'>
      <Progress nodes={nodes} />
      <StatusRoll lines={lines} autoAdvance classNames='pis-4 text-sm text-subdued' />
    </div>
  );
};
