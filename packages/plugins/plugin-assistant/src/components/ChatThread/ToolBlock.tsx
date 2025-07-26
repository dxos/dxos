//
// Copyright 2025 DXOS.org
//

import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';

import { type AgentStatus, type Tool } from '@dxos/ai';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { NumericTabs, StatusRoll, ToggleContainer } from '@dxos/react-ui-components';
import { type JsonProps, Json as NativeJson } from '@dxos/react-ui-syntax-highlighter';
import { type DataType } from '@dxos/schema';
import { isNonNullable, isNotFalsy } from '@dxos/util';

export const isToolMessage = (message: DataType.Message) => {
  return message.blocks.some((block) => block._tag === 'toolCall' || block._tag === 'toolResult');
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

export type ToolBlockProps = ThemedClassName<{
  message: DataType.Message;
  tools?: Tool[];
}>;

export const ToolBlock: FC<ToolBlockProps> = ({ classNames, message, tools }) => {
  const { blocks = [] } = message;

  let request: { tool: Tool | undefined; block: any } | undefined;
  const toolBlocks = blocks.filter((block) => block._tag === 'toolCall' || block._tag === 'toolResult');
  const items = toolBlocks
    .map((block) => {
      switch (block._tag) {
        case 'toolCall': {
          // TODO(burdon): Skip these updates?
          if (block.pending && request?.block.toolCallId === block.toolCallId) {
            return null;
          }

          request = { tool: tools?.find((tool) => tool.name === block.name), block };
          return {
            title: getToolCaption(request.tool, undefined), // block.status), // TODO(burdon): Get status?
            block,
          };
        }

        case 'toolResult': {
          if (!request) {
            log.warn('unexpected message', { block });
            return { title: 'Error', block };
          }

          return {
            title: `${getToolCaption(request.tool, undefined)} (Success)`,
            block,
          };
        }

        default: {
          request = undefined;
          return {
            title: 'Error',
            block,
          };
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
      <div className='w-full grid grid-cols-[32px_1fr]'>
        <NumericTabs ref={tabsRef} length={items.length} selected={selected} onSelect={handleSelect} />
        <Json data={items[selected].block} />
      </div>
    </ToggleContainer>
  );
};

export const Json = ({ data }: Pick<JsonProps, 'data'>) => (
  <NativeJson data={data} classNames='!p-1 text-xs bg-transparent' />
);
