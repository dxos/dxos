//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { NumericTabs, TextCrawl, ToggleContainer, type ToggleContainerRootProps } from '@dxos/react-ui-components';
import { type XmlWidgetProps } from '@dxos/react-ui-editor';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { type DataType } from '@dxos/schema';
import { isNonNullable, safeParseJson } from '@dxos/util';

import { meta } from '../../meta';

export const isToolMessage = (message: DataType.Message.Message) => {
  return message.blocks.some((block) => block._tag === 'toolCall' || block._tag === 'toolResult');
};

export type ToolBlockProps = XmlWidgetProps<{
  blocks: DataType.ContentBlock.Any[];
}>;

export const ToolBlock = ({ view, blocks = [] }: ToolBlockProps) => {
  const { t } = useTranslation(meta.id);

  const items = useMemo<ToolContainerParams['items']>(() => {
    let lastToolCall: { tool: Tool.Any | undefined; block: DataType.ContentBlock.ToolCall } | undefined;
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
              title: tool?.description ?? [t('tool call label'), tool?.name].join(' '),
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
                title: t('tool error label'),
                content: block,
              };
            }

            const title =
              lastToolCall?.tool?.description ?? [t('tool result label'), lastToolCall?.tool?.name].join(' ');
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

  const handleChangeOpen = useCallback(() => {
    setTimeout(() => {
      // Measure after animation.
      view?.requestMeasure();
    }, 1_000);
  }, [view]);

  if (!items.length) {
    return null;
  }

  return <ToolContainer items={items} onChangeOpen={handleChangeOpen} />;
};

ToolBlock.displayName = 'ToolBlock';

type ToolContainerParams = {
  items: { title: string; content: any }[];
} & Pick<ToggleContainerRootProps, 'onChangeOpen'>;

export const ToolContainer = ({ items, onChangeOpen }: ToolContainerParams) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onChangeOpen?.(open);
    if (open) {
      tabsRef.current?.focus();
    }
  }, [onChangeOpen, open]);

  const handleSelect = (index: number) => {
    setSelected(index);
  };

  return (
    <ToggleContainer.Root classNames='mbs-2 is-full rounded-sm' open={open} onChangeOpen={setOpen}>
      <ToggleContainer.Header classNames='text-sm text-placeholder'>
        <TextCrawl key='status-roll' lines={items.map((item) => item.title)} autoAdvance greedy />
      </ToggleContainer.Header>
      <ToggleContainer.Content classNames='grid grid-cols-[32px_1fr]'>
        <NumericTabs ref={tabsRef} classNames='p-1' length={items.length} selected={selected} onSelect={handleSelect} />
        <Json
          data={items[selected]?.content}
          classNames='p-1 text-xs bg-transparent'
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
