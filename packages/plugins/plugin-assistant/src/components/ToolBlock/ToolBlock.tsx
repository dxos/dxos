//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type AgentStatus } from '@dxos/ai';
import { useTranslation } from '@dxos/react-ui';
import {
  NumericTabs,
  TextCrawl,
  ToggleContainer,
  chatMessageJson,
  chatMessagePanel,
  chatMessagePanelContent,
  chatMessagePanelHeader,
} from '@dxos/react-ui-components';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { type ContentBlock, type DataType } from '@dxos/schema';
import { isNonNullable, safeParseJson } from '@dxos/util';

import { meta } from '../../meta';

export const isToolMessage = (message: DataType.Message) => {
  return message.blocks.some((block) => block._tag === 'toolCall' || block._tag === 'toolResult');
};

export type ToolBlockProps = {
  blocks: ContentBlock.Any[];
};

export const ToolBlock = ({ blocks = [] }: ToolBlockProps) => {
  const { t } = useTranslation(meta.id);

  const getToolCaption = (tool?: Tool.Any, status?: AgentStatus) => {
    if (!tool) {
      return t('calling tool label');
    }

    return status?.message ?? tool.description ?? [t('calling label'), tool.name].join(' ');
  };

  const items = useMemo(() => {
    let lastToolCall: { tool: Tool.Any | undefined; block: ContentBlock.ToolCall } | undefined;
    // TODO(burdon): Get from context?
    const tools: Tool.Any[] = []; //processor.conversation.toolkit?.tools ?? [];
    return blocks
      .filter((block) => block._tag === 'toolCall' || block._tag === 'toolResult' || block._tag === 'summary')
      .map((block) => {
        switch (block._tag) {
          case 'toolCall': {
            if (block.pending && lastToolCall?.block.toolCallId === block.toolCallId) {
              return null;
            }

            const tool = tools.find((tool) => tool.name === block.name);
            lastToolCall = { tool, block };
            return {
              title: getToolCaption(lastToolCall?.tool),
              content: {
                ...block,
                input: safeParseJson(block.input),
              },
            };
          }

          case 'toolResult': {
            // TODO(burdon): Parse error type.
            if (block.error) {
              return {
                title: t('error label'),
                content: block,
              };
            }

            const title = getToolCaption(lastToolCall?.tool ?? t('tool result label'));
            lastToolCall = undefined;
            return {
              title,
              content: {
                ...block,
                result: safeParseJson(block.result),
              },
            };
          }

          case 'summary': {
            if (!lastToolCall) {
              return null;
            }

            return {
              title: t('summary label'),
              content: block,
            };
          }
        }
      })
      .filter(isNonNullable);
  }, [blocks]);

  if (!items.length) {
    return null;
  }

  return <ToolContainer items={items} />;
};

ToolBlock.displayName = 'ToolBlock';

type ToolContainerParams = {
  items: { title: string; content: any }[];
};

// TODO(burdon): Maintain scroll position when closing.
export const ToolContainer = ({ items }: ToolContainerParams) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) {
      tabsRef.current?.focus();
    }
  }, [open]);

  const handleSelect = (index: number) => {
    setSelected(index);
  };

  const data = items[selected]?.content;

  return (
    <ToggleContainer.Root classNames={chatMessagePanel} open={open} onChangeOpen={setOpen}>
      <ToggleContainer.Header classNames={chatMessagePanelHeader}>
        <TextCrawl key='status-roll' lines={items.map((item) => item.title)} />
      </ToggleContainer.Header>
      <ToggleContainer.Content classNames={['grid grid-cols-[32px_1fr]', chatMessagePanelContent]}>
        <NumericTabs ref={tabsRef} classNames='p-1' length={items.length} selected={selected} onSelect={handleSelect} />
        <Json
          data={data}
          classNames={chatMessageJson}
          replacer={{
            maxDepth: 3,
            maxArrayLen: 10,
            maxStringLen: 128,
          }}
        />
      </ToggleContainer.Content>
    </ToggleContainer.Root>
  );
};
