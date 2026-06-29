//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Icon, useTranslation } from '@dxos/react-ui';
import { NumericTabs, TextCrawl, TogglePanel, type TogglePanelRootProps } from '@dxos/react-ui-components';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type ContentBlock, type Message } from '@dxos/types';
import { type XmlWidgetProps } from '@dxos/ui-editor';
import { isNonNullable, safeParseJson } from '@dxos/util';

import { meta } from '#meta';

export const isToolMessage = (message: Message.Message) => {
  return message.blocks.some((block: ContentBlock.Any) => block._tag === 'toolCall' || block._tag === 'toolResult');
};

export type ToolWidgetProps = XmlWidgetProps<{
  blocks: ContentBlock.Any[];
}>;

export const ToolWidget = ({ view, blocks = [] }: ToolWidgetProps) => {
  const { t } = useTranslation(meta.profile.key);

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
              icon: block.operationIcon,
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
                icon: lastToolCall?.block.operationIcon,
                content: block,
              };
            }

            const title =
              lastToolCall?.tool?.description ??
              [t('tool-result.label'), lastToolCall?.block.name].filter(Boolean).join(' ');
            const icon = lastToolCall?.block.operationIcon;
            lastToolCall = undefined;
            return {
              title,
              icon,
              content: {
                ...block,
                result: typeof block.result === 'string' ? safeParseJson(block.result) : block.result,
              },
            };
          }

          case 'stats': {
            if (!lastToolCall) {
              return null;
            }

            return {
              title: t('stats.label'),
              icon: lastToolCall.block.operationIcon,
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

  // Ignore if empty.
  if (!items.length) {
    return null;
  }

  return <ToolPanel items={items} onChangeOpen={handleChangeOpen} />;
};

type ToolPanelItem = { title: string; icon?: string; content: any };

type ToolPanelProps = {
  items: ToolPanelItem[];
} & Pick<TogglePanelRootProps, 'onChangeOpen'>;

const DEFAULT_TOOL_ICON = 'ph--wrench--regular';

const ToolPanel = ({ items, onChangeOpen }: ToolPanelProps) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);

  // Clamp selected to avoid out-of-bounds after items shrink.
  useEffect(() => {
    setSelected((prev) => Math.min(prev, Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    onChangeOpen?.(open);
    if (open) {
      tabsRef.current?.focus();
    }
  }, [open, onChangeOpen]);

  const handleSelect = useCallback((index: number) => {
    setSelected(index);
  }, []);

  // Prefer the icon from the latest tool call so the header reflects what's currently active.
  // TextCrawl shows multiple titles, but only one icon slot — using the most recent keeps it in sync
  // with the visible operation while it streams.
  const headerIcon = items[items.length - 1]?.icon ?? items[0]?.icon ?? DEFAULT_TOOL_ICON;

  return (
    <TogglePanel.Root open={open} onChangeOpen={setOpen}>
      <TogglePanel.Content>
        <TogglePanel.Header classNames='flex items-center gap-2 text-sm text-placeholder'>
          <Icon icon={headerIcon} size={4} classNames='shrink-0 opacity-70' />
          <TextCrawl key='status-roll' lines={items.map((item) => item.title)} autoAdvance greedy />
        </TogglePanel.Header>
        <TogglePanel.Body>
          <TogglePanel.Viewport classNames='grid grid-cols-[32px_1fr]'>
            <NumericTabs
              ref={tabsRef}
              classNames='p-1'
              length={items.length}
              selected={selected}
              onSelect={handleSelect}
            />
            <JsonHighlighter
              data={items[selected]?.content}
              classNames='p-1 text-xs bg-transparent'
              replacer={{
                maxDepth: 3,
                maxArrayLen: 10,
                maxStringLen: 128,
              }}
            />
          </TogglePanel.Viewport>
        </TogglePanel.Body>
      </TogglePanel.Content>
    </TogglePanel.Root>
  );
};
