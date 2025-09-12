//
// Copyright 2025 DXOS.org
//

import { type AiTool } from '@effect/ai';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type AgentStatus } from '@dxos/ai';
import { useTranslation } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { type ContentBlock, type DataType } from '@dxos/schema';
import { isNonNullable, isNotFalsy } from '@dxos/util';
import { safeParseJson } from '@dxos/util';

import { chatMessageJson, chatMessagePanel, chatMessagePanelContent, chatMessagePanelHeader } from '../../fragments';
import { translationKey } from '../../translations';
import { NumericTabs } from '../NumericTabs';
import { TextCrawl } from '../TextCrawl';
import { ToggleContainer } from '../ToggleContainer';

export const isToolMessage = (message: DataType.Message) => {
  return message.blocks.some((block) => block._tag === 'toolCall' || block._tag === 'toolResult');
};

export type AiToolProvider = () => readonly AiTool.Any[];

export type ToolBlockProps = {
  message: DataType.Message;
  toolProvider: AiToolProvider;
};

// TODO(burdon): Pass in blocks.
export const ToolBlock = ({ message, toolProvider }: ToolBlockProps) => {
  const { t } = useTranslation(translationKey);
  const { blocks = [] } = message;

  const getToolCaption = (tool?: AiTool.Any, status?: AgentStatus) => {
    if (!tool) {
      return t('calling tool label');
    }

    return status?.message ?? tool.description ?? [t('calling label'), tool.name].join(' ');
  };

  const items = useMemo(() => {
    let lastToolCall: { tool: AiTool.Any | undefined; block: ContentBlock.ToolCall } | undefined;
    const tools = toolProvider();
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

  return <ToolContainer items={items} />;
};

type ToolContainerParams = {
  items: { title: string; content: any }[];
};

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

  const title = useMemo(() => {
    const lines = items.map((item) => item.title).filter(isNotFalsy);
    return <TextCrawl key='status-roll' lines={lines} />;
  }, [items]);

  const data = items[selected].content;

  return (
    <ToggleContainer.Root classNames={chatMessagePanel} open={open} onChangeOpen={setOpen}>
      <ToggleContainer.Header classNames={chatMessagePanelHeader} title={title} />
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
