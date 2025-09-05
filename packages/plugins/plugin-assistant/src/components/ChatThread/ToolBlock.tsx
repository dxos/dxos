//
// Copyright 2025 DXOS.org
//

import { type AiTool } from '@effect/ai';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type AgentStatus } from '@dxos/ai';
import { useTranslation } from '@dxos/react-ui';
import { NumericTabs, TextCrawl, ToggleContainer } from '@dxos/react-ui-components';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { type DataType } from '@dxos/schema';
import { isNonNullable, isNotFalsy } from '@dxos/util';
import { safeParseJson } from '@dxos/util';

import { meta } from '../../meta';

import { styles } from './ChatMessage';

export const isToolMessage = (message: DataType.Message) => {
  return message.blocks.some((block) => block._tag === 'toolCall' || block._tag === 'toolResult');
};

export type AiToolProvider = () => readonly AiTool.Any[];

export type ToolBlockProps = {
  message: DataType.Message;
  toolProvider: AiToolProvider;
};

export const ToolBlock = ({ message, toolProvider }: ToolBlockProps) => {
  const { t } = useTranslation(meta.id);

  const tools = toolProvider();
  const getToolCaption = (tool?: AiTool.Any, status?: AgentStatus) => {
    if (!tool) {
      return t('calling tool label');
    }

    return status?.message ?? tool.description ?? [t('calling label'), tool.name].join(' ');
  };

  let request: { tool: AiTool.Any | undefined; block: any } | undefined;
  const { blocks = [] } = message;
  const toolBlocks = blocks.filter((block) => block._tag === 'toolCall' || block._tag === 'toolResult');
  const items = toolBlocks
    .map((block) => {
      switch (block._tag) {
        case 'toolCall': {
          if (block.pending && request?.block.toolCallId === block.toolCallId) {
            return null;
          }

          const tool = tools.find((tool) => tool.name === block.name);
          request = { tool, block };
          return {
            title: getToolCaption(request.tool, request.block.status),
            block: {
              ...block,
              input: safeParseJson(block.input),
            },
          };
        }

        case 'toolResult': {
          if (!request || block.error) {
            return {
              title: t('error label'),
              block,
            };
          }

          return {
            title: getToolCaption(request.tool, request.block.status),
            block: {
              ...block,
              result: safeParseJson(block.result),
            },
          };
        }

        default: {
          request = undefined;
          return {
            title: t('error label'),
            block,
          };
        }
      }
    })
    .filter(isNonNullable);

  return <ToolContainer items={items} />;
};

export const ToolContainer = ({ items }: { items: { title: string; block: any }[] }) => {
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
    return <TextCrawl key='status-roll' lines={lines} autoAdvance />;
  }, [items]);

  return (
    <ToggleContainer.Root classNames={styles.panel} open={open} onChangeOpen={setOpen}>
      <ToggleContainer.Header classNames={styles.panelHeader} title={title} />
      <ToggleContainer.Content classNames={['grid grid-cols-[32px_1fr]', styles.panelContent]}>
        <NumericTabs ref={tabsRef} classNames='p-1' length={items.length} selected={selected} onSelect={handleSelect} />
        <Json
          data={items[selected].block}
          classNames={styles.json}
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
