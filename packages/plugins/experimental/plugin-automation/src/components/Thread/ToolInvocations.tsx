//
// Copyright 2025 DXOS.org
//

import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';

import { type Message, type MessageContentBlock } from '@dxos/artifact';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { NumericTabs, StatusRoll, ToggleContainer } from '@dxos/react-ui-components';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { isNonNullable, isNotFalsy } from '@dxos/util';

import { type ThreadMessageProps } from './ThreadMessage';

export const isToolMessage = (message: Message) => {
  return message.content.some((block) => block.type === 'tool_use' || block.type === 'tool_result');
};

export const ToolBlock: FC<ThemedClassName<ThreadMessageProps>> = ({ classNames, message }) => {
  const { content = [] } = message;

  let request: (MessageContentBlock & { type: 'tool_use' }) | undefined;
  const blocks = content.filter((block) => block.type === 'tool_use' || block.type === 'tool_result');
  const items = blocks
    .map((block, i) => {
      switch (block.type) {
        case 'tool_use': {
          // TODO(burdon): Skip these updates?
          if (block.id === request?.id && block.pending) {
            return null;
          }

          request = block;
          // TODO(burdon): Get plugin name.
          return { title: `Calling ${block.name}...`, block };
        }

        case 'tool_result': {
          if (!request) {
            log.warn('unexpected message', { block });
            return { title: 'Error', block };
          }

          return { title: `Processed ${request.name}`, block };
        }

        default: {
          request = undefined;
          return { title: 'Error', block };
        }
      }
    })
    .filter(isNonNullable);

  return <ToolContainer classNames={classNames} items={items} />;
};

export const ToolContainer: FC<ThemedClassName<{ items: { title: string; block: any }[] }>> = ({
  classNames,
  items,
}) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) {
      tabsRef.current?.focus();
    }
  }, [open]);

  const handleSelect = (index: number) => {
    if (index === selected) {
      setOpen(false);
    } else {
      setSelected(index);
    }
  };

  const title = useMemo(() => {
    const lines = items.map((item) => item.title).filter(isNotFalsy);
    return <StatusRoll key='status-roll' lines={lines} autoAdvance />;
  }, [items]);

  return (
    <ToggleContainer classNames={['flex flex-col', classNames]} title={title} open={open} onChangeOpen={setOpen}>
      <div className='grid grid-cols-[32px_1fr]'>
        <NumericTabs ref={tabsRef} length={items.length} selected={selected} onSelect={handleSelect} />
        <Json data={items[selected].block} classNames='!p-1 text-xs' />
      </div>
    </ToggleContainer>
  );
};
