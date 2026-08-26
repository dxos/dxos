//
// Copyright 2025 DXOS.org
//

import type * as Tool from 'effect/unstable/ai/Tool';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Icon, IconBlock, TextCrawl, useTranslation } from '@dxos/react-ui';
import { NumericTabs, TogglePanel, type TogglePanelRootProps } from '@dxos/react-ui-components';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type ContentBlock } from '@dxos/types';
import { type XmlWidgetProps, getXmlTextChild } from '@dxos/ui-editor';
import { safeParseJson } from '@dxos/util';

import { translationKey } from '../translations';

export type ToolWidgetProps = XmlWidgetProps;

/**
 * A run of tool blocks as one collapsible panel with a tab per call. The `<toolkit>` tag carries
 * the run as JSON — the item is rebuilt from its message alone, so there is no widget-state side
 * channel to accumulate blocks through.
 */
export const ToolWidget = ({ view, children }: ToolWidgetProps) => {
  const { t } = useTranslation(translationKey);
  const blocks = useMemo<ContentBlock.Any[]>(() => {
    const parsed = safeParseJson(getXmlTextChild(children ?? []) ?? '');
    return Array.isArray(parsed) ? (parsed as ContentBlock.Any[]) : [];
  }, [children]);

  const items = useMemo<ToolPanelProps['items']>(() => {
    let lastToolCall: { tool: Tool.Any | undefined; block: ContentBlock.ToolCall } | undefined;
    const tools: Tool.Any[] = [];
    const items: ToolPanelItem[] = [];
    // Index of the panel for each call, so a streamed pending call is replaced by its completed
    // form rather than shown twice.
    const indexByToolCallId = new Map<string, number>();

    const push = (id: string | undefined, item: ToolPanelItem) => {
      const existing = id !== undefined ? indexByToolCallId.get(id) : undefined;
      if (existing !== undefined) {
        items[existing] = item;
      } else {
        if (id !== undefined) {
          indexByToolCallId.set(id, items.length);
        }
        items.push(item);
      }
    };

    for (const block of blocks) {
      switch (block._tag) {
        case 'toolCall': {
          const tool = tools.find((tool) => tool.name === block.name);
          lastToolCall = { tool, block };
          push(block.toolCallId, {
            title: tool?.description ?? [t('tool-call.label'), block.name].filter(Boolean).join(' '),
            icon: block.operationIcon,
            // Show the call's params; the block's transport metadata is noise to the reader.
            content: safeParseJson(block.input) ?? (block.input || {}),
          });
          break;
        }

        case 'toolResult': {
          // TODO(burdon): Parse error type.
          if (block.error) {
            push(undefined, {
              title: t('tool-error.label'),
              icon: lastToolCall?.block.operationIcon,
              content: block.error,
            });
            break;
          }

          const title =
            lastToolCall?.tool?.description ??
            [t('tool-result.label'), lastToolCall?.block.name].filter(Boolean).join(' ');
          const icon = lastToolCall?.block.operationIcon;
          lastToolCall = undefined;
          push(undefined, {
            title,
            icon,
            content: typeof block.result === 'string' ? (safeParseJson(block.result) ?? block.result) : block.result,
          });
          break;
        }

        case 'stats': {
          if (!lastToolCall) {
            break;
          }

          push(undefined, {
            title: t('stats.label'),
            icon: lastToolCall.block.operationIcon,
            content: block,
          });
          break;
        }
      }
    }

    return items;
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
        <TogglePanel.Header classNames='flex items-center gap-2 text-sm'>
          <div className='w-full grid grid-cols-[1fr_auto] items-center gap-2'>
            <TextCrawl
              key='status-roll'
              classNames='text-description'
              lines={items.map((item) => item.title)}
              autoAdvance
              greedy
            />
            <IconBlock>
              <Icon icon={headerIcon} size={4} />
            </IconBlock>
          </div>
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
