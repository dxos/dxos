//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { NumericTabs, TextCrawl, TogglePanel, type TogglePanelRootProps } from '@dxos/react-ui-components';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { type ContentBlock, type Message } from '@dxos/types';
import { type XmlWidgetProps } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isNonNullable, safeParseJson } from '@dxos/util';

import { meta } from '#meta';

export const isToolMessage = (message: Message.Message) => {
  return message.blocks.some((block: ContentBlock.Any) => block._tag === 'toolCall' || block._tag === 'toolResult');
};

export type ToolWidgetProps = XmlWidgetProps<{
  blocks: ContentBlock.Any[];
}>;

export const ToolWidget = ({ view, blocks = [] }: ToolWidgetProps) => {
  const { t } = useTranslation(meta.id);

  const items = useMemo<ToolPanelProps['items']>(() => {
    let lastToolCall: { tool: Tool.Any | undefined; block: ContentBlock.ToolCall } | undefined;
    // TODO(burdon): Get from context?
    const tools: Tool.Any[] = []; //processor.conversation.toolkit?.tools ?? [];
    return blocks
      .filter((block) => block._tag === 'toolCall' || block._tag === 'toolResult' || block._tag === 'stats')
      .map((block) => {
        switch (block._tag) {
          case 'toolCall': {
            if (block.pending && lastToolCall?.block.toolCallId === block.toolCallId) {
              return null;
            }

            const tool = tools.find((tool) => tool.name === block.name);
            lastToolCall = { tool, block };
            return {
              title: tool?.description ?? [t('tool-call.label'), block.name].filter(Boolean).join(' '),
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
                title: t('tool-error.label'),
                content: block,
              };
            }

            const title =
              lastToolCall?.tool?.description ??
              [t('tool-result.label'), lastToolCall?.block.name].filter(Boolean).join(' ');
            lastToolCall = undefined;
            return {
              title,
              content: {
                ...block,
                result: safeParseJson(block.result),
              },
            };
          }

          case 'stats': {
            if (!lastToolCall) {
              return null;
            }

            return {
              title: t('stats.label'),
              content: block,
            };
          }
        }
      })
      .filter(isNonNullable);
  }, [blocks, t]);

  const handleChangeOpen = useCallback(() => {
    setTimeout(() => {
      // Measure after animation.
      view?.requestMeasure();
    }, 1_000);
  }, [view]);

  const { callItems, resultItems } = useMemo(() => {
    const callItems = items.filter((item) => item.content?._tag === 'toolCall' || item.content?._tag === 'stats');
    const resultItems = items.filter((item) => item.content?._tag === 'toolResult');
    return { callItems, resultItems };
  }, [items]);

  if (callItems.length === 0 && resultItems.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-1'>
      {callItems.length > 0 && (
        <ToolPanel items={callItems} onChangeOpen={handleChangeOpen} textCrawlKey='tool-call-crawl' />
      )}
      {resultItems.length > 0 && (
        <ToolPanel items={resultItems} onChangeOpen={handleChangeOpen} textCrawlKey='tool-result-crawl' />
      )}
    </div>
  );
};

type ToolPanelProps = {
  items: { title: string; content: any }[];
  textCrawlKey: string;
} & Pick<TogglePanelRootProps, 'onChangeOpen'>;

const ToolPanel = ({ items, onChangeOpen, textCrawlKey }: ToolPanelProps) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onChangeOpen?.(open);
    if (open && items.length > 1) {
      tabsRef.current?.focus();
    }
  }, [open, onChangeOpen, items.length]);

  const handleSelect = useCallback((index: number) => {
    setSelected(index);
  }, []);

  useEffect(() => {
    setSelected((previous) => Math.min(previous, Math.max(0, items.length - 1)));
  }, [items.length]);

  return (
    <TogglePanel.Root classNames='w-full rounded-xs !border-0' open={open} onChangeOpen={setOpen}>
      <TogglePanel.Header classNames='text-sm text-placeholder p-0.5 gap-0.5'>
        <TextCrawl key={textCrawlKey} size='sm' lines={items.map((item) => item.title)} autoAdvance greedy />
      </TogglePanel.Header>
      <TogglePanel.Content classNames={items.length > 1 ? 'grid grid-cols-[32px_1fr]' : 'grid grid-cols-1'}>
        {items.length > 1 && (
          <NumericTabs
            ref={tabsRef}
            classNames='p-0.5'
            length={items.length}
            selected={selected}
            onSelect={handleSelect}
          />
        )}
        <Json.Data
          data={items[selected]?.content}
          classNames={mx(
            'text-xs bg-transparent',
            open ? (items.length > 1 ? 'py-1 pl-8 pr-4' : 'py-1 px-4') : 'p-0.5',
          )}
          replacer={{
            maxDepth: 3,
            maxArrayLen: 10,
            maxStringLen: 128,
          }}
        />
      </TogglePanel.Content>
    </TogglePanel.Root>
  );
};
