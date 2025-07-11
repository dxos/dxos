//
// Copyright 2025 DXOS.org
//

import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';

import { type AgentStatus, type Message, type Tool } from '@dxos/ai'; // TODO(burdon): !!!
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { NumericTabs, StatusRoll, ToggleContainer } from '@dxos/react-ui-components';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { isNonNullable, isNotFalsy } from '@dxos/util';

import { type ThreadMessageProps } from './ThreadMessage';

export const isToolMessage = (message: Message) => {
  return message.content.some((block) => block.type === 'tool_use' || block.type === 'tool_result');
};

const getToolName = (tool: Tool) => {
  return tool.namespace && tool.function ? `${tool.namespace}:${tool.function}` : tool.name.split('_').pop();
};

const getToolCaption = (tool: Tool | undefined, status: AgentStatus | undefined) => {
  if (!tool) {
    return 'Calling tool...';
  }

  return status?.message ?? tool.caption ?? `Calling ${getToolName(tool)}...`;
};

export const ToolBlock: FC<ThemedClassName<ThreadMessageProps>> = ({ classNames, message, tools }) => {
  const { content = [] } = message;

  let request: { tool: Tool | undefined; block: any } | undefined;
  const blocks = content.filter((block) => block.type === 'tool_use' || block.type === 'tool_result');
  const items = blocks
    .map((block) => {
      switch (block.type) {
        case 'tool_use': {
          // TODO(burdon): Skip these updates?
          if (block.pending && request?.block.id === block.id) {
            return null;
          }

          log.info('tool_use', { tool: request?.tool, status: block.currentStatus });

          request = { tool: tools?.find((tool) => tool.name === block.name), block };
          return { title: getToolCaption(request.tool, block.currentStatus), block };
        }

        case 'tool_result': {
          if (!request) {
            log.warn('unexpected message', { block });
            return { title: 'Error', block };
          }

          return { title: `${getToolCaption(request.tool, undefined)} (Success)`, block };
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
    return <StatusRoll key='status-roll' lines={lines} duration={1_000} autoAdvance />;
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
