//
// Copyright 2025 DXOS.org
//

import { MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type Message } from '@dxos/types';

import { meta } from '#meta';

import { useExtractorActions } from './useExtractorActions';

/**
 * How the selected block is sourced and rendered.
 *   - `enriched`: the enriched (second) text block, decorated via the markdown extensions.
 *   - `markdown`: the plain (first) text block, decorated via the markdown extensions.
 *   - `plain`:    the plain (first) text block, shown verbatim with no markdown parsing.
 */
export type ViewMode = 'enriched' | 'markdown' | 'plain';

const VIEW_MODES: { id: ViewMode; icon: string }[] = [
  { id: 'enriched', icon: 'ph--article--regular' },
  { id: 'markdown', icon: 'ph--markdown-logo--regular' },
  { id: 'plain', icon: 'ph--text-t--regular' },
];

export type UseMessageToolbarActionsProps = {
  message: Message.Message;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpen?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
};

export const useMessageActions = ({
  message,
  viewMode,
  setViewMode,
  onOpen,
  onReply,
  onReplyAll,
  onForward,
}: UseMessageToolbarActionsProps) => {
  const extractorActions = useExtractorActions(message);

  // The enriched option is only offered when the message carries a non-empty enriched (second) block.
  const enrichedAvailable = (() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    return textBlocks.length > 1 && !!textBlocks[1]?.text;
  })();

  return useMenuBuilder(() => {
    let builder = MenuBuilder.make()
      .root({ label: ['message-toolbar.label', { ns: meta.id }] })
      .subgraph(
        onOpen &&
          ((b) =>
            b.action(
              'open',
              {
                label: ['message-toolbar-open.menu', { ns: meta.id }],
                icon: 'ph--arrow-square-out--regular',
              },
              onOpen,
            )),
      )
      .group(
        'viewMode',
        {
          label: ['message-toolbar-view.menu', { ns: meta.id }],
          icon: 'ph--article--regular',
          iconOnly: true,
          variant: 'dropdownMenu',
          applyActive: true,
          selectCardinality: 'single',
          value: viewMode,
        },
        (group) => {
          for (const mode of VIEW_MODES) {
            if (mode.id === 'enriched' && !enrichedAvailable) {
              continue;
            }
            group.action(
              mode.id,
              {
                label: [`message-toolbar-view-${mode.id}.menu`, { ns: meta.id }],
                icon: mode.icon,
                checked: viewMode === mode.id,
              },
              () => setViewMode(mode.id),
            );
          }
        },
      )
      .separator('gap')
      .subgraph(
        onReply &&
          ((b) =>
            b.action(
              'reply',
              {
                label: ['message-toolbar-reply.menu', { ns: meta.id }],
                icon: 'ph--arrow-bend-up-left--regular',
              },
              onReply,
            )),
      )
      .subgraph(
        onReplyAll &&
          ((b) =>
            b.action(
              'replyAll',
              {
                label: ['message-toolbar-reply-all.menu', { ns: meta.id }],
                icon: 'ph--arrow-bend-double-up-left--regular',
              },
              onReplyAll,
            )),
      )
      .subgraph(
        onForward &&
          ((b) =>
            b.action(
              'forward',
              {
                label: ['message-toolbar-forward.menu', { ns: meta.id }],
                icon: 'ph--arrow-bend-up-right--regular',
              },
              onForward,
            )),
      );

    if (extractorActions.length > 0) {
      builder = builder.group(
        'extract',
        {
          label: ['message-toolbar-extract.menu', { ns: meta.id }],
          icon: 'ph--magic-wand--regular',
          iconOnly: true,
          variant: 'dropdownMenu',
        },
        (group) => {
          for (const item of extractorActions) {
            group.action(`extract-${item.id}`, { label: item.label }, item.onSelect);
          }
        },
      );
    }

    return builder.build();
  }, [viewMode, setViewMode, enrichedAvailable, onOpen, onReply, onReplyAll, onForward, extractorActions]);
};
