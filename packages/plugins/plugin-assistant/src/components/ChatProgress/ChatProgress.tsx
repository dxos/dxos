//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Chat } from '@dxos/assistant-toolkit';
import { addEventListener } from '@dxos/async';
import { ProgressBar, type ProgressBarProps, TextCrawl, useExecutionGraph } from '@dxos/react-ui-components';

export type ChatProgressProps = {
  chat: Chat.Chat;
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
    <div role='none' tabIndex={0} ref={ref} className='flex flex-col outline-hidden'>
      <ProgressBar nodes={nodes} index={index} onSelect={handleSelect} />
      <TextCrawl classNames='pl-4 text-sm text-description' lines={lines} autoAdvance />
    </div>
  );
};
