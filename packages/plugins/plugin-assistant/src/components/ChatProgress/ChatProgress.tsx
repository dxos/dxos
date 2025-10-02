//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { Flex, ProgressBar, type ProgressBarProps, TextCrawl, useExecutionGraph } from '@dxos/react-ui-components';

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
  const { commits } = useExecutionGraph(chat.traceQueue?.target, true);
  const nodes = useMemo(() => commits.map((commit) => ({ id: commit.id, message: commit.message })), [commits]);
  const lines = useMemo(() => commits.map((commit) => commit.message), [commits]);

  const [index, setIndex] = useState<number | undefined>(undefined);
  const handleSelect = useCallback<NonNullable<ProgressBarProps['onSelect']>>(({ index }) => {
    setIndex((current) => {
      return current === index ? undefined : index;
    });
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    return addEventListener(ref.current, 'keydown', (event) => {
      switch (event.key) {
        case 'ArrowLeft': {
          setIndex((current) => (current === undefined || current <= 0 ? 0 : current - 1));
          break;
        }
        case 'ArrowRight': {
          setIndex((current) => (current === undefined || current >= nodes.length ? nodes.length - 1 : current + 1));
          break;
        }
      }
    });
  }, [nodes.length]);

  return (
    <Flex column tabIndex={0} ref={ref} classNames='outline-none'>
      <ProgressBar nodes={nodes} index={index} onSelect={handleSelect} />
      <TextCrawl lines={lines} index={index} autoAdvance classNames='pis-4 text-sm text-subdued' />
    </Flex>
  );
};
