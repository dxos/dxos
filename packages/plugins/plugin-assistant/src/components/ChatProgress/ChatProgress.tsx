//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { Flex, ProgressBar, type ProgressBarProps, TextCrawl, useExecutionGraph } from '@dxos/react-ui-components';

import { type Assistant } from '../../types';

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
      <TextCrawl classNames='pis-4 text-sm text-description' lines={lines} autoAdvance />
    </Flex>
  );
};
