//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { addEventListener } from '@dxos/async';
import { useStateWithRef } from '@dxos/react-ui';
import { Flex, Progress, type ProgressProps, StatusRoll } from '@dxos/react-ui-components';

import { useExecutionGraph } from '../../hooks';
import { type Assistant } from '../../types';

// TODO(burdon): Reset after each session.
// TODO(burdon): Show after delay.
// TODO(burdon): Test with errors.
// TODO(burdon): Filter out empty trace messages.

// {
//   "id": "01K3TE3C2VAXETP500QKDHK3C4_block_3",
//   "branch": "main",
//   "parents": [],
//   "icon": "ph--robot--regular",
//   "message": "\n"
// }

export type ChatProgressProps = {
  chat: Assistant.Chat;
};

export const ChatProgress = ({ chat }: ChatProgressProps) => {
  const { commits } = useExecutionGraph(chat.traceQueue);
  const nodes = useMemo(() => commits.map((commit) => ({ id: commit.id, message: commit.message })), [commits]);
  const lines = useMemo(() => commits.map((commit) => commit.message), [commits]);
  console.log(JSON.stringify(commits, null, 2));

  const [index, setIndex] = useStateWithRef<number | undefined>(undefined);
  const handleSelect = useCallback<NonNullable<ProgressProps['onSelect']>>(({ index }) => {
    setIndex((current) => (index === current ? undefined : index));
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    return addEventListener(ref.current, 'keydown', (event) => {
      switch (event.key) {
        case 'ArrowLeft': {
          setIndex((current) => (current === undefined ? undefined : current - 1));
          break;
        }
        case 'ArrowRight': {
          setIndex((current) => (current === undefined ? undefined : current + 1));
          break;
        }
      }
    });
  }, []);

  return (
    <Flex column tabIndex={0} ref={ref}>
      <Progress nodes={nodes} index={index} onSelect={handleSelect} />
      <StatusRoll lines={lines} index={index} autoAdvance classNames='pis-4 text-sm text-subdued' />
      <Flex classNames='text-small justify-center'>{JSON.stringify({ commits: commits.length })}</Flex>
    </Flex>
  );
};
