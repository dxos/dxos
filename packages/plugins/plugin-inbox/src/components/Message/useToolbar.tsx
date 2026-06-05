//
// Copyright 2025 DXOS.org
//

import { MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type Message } from '@dxos/types';

import { meta } from '#meta';

import { type ViewMode, viewModeGroup } from '../ViewMode';
import { useExtractorActions } from './useExtractorActions';

export type UseMessageToolbarActionsProps = {
  message: Message.Message;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /** Whether remote images are currently loaded inline. */
  loadRemoteImages: boolean;
  /** Toggle the remote-image loading setting. */
  onToggleLoadImages: () => void;
  onOpen?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
};

export const useMessageActions = ({
  message,
  viewMode,
  setViewMode,
  loadRemoteImages,
  onToggleLoadImages,
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
      .subgraph(
        viewModeGroup({
          ns: meta.id,
          viewMode,
          setViewMode,
          modes: enrichedAvailable ? ['enriched', 'markdown', 'plain'] : ['markdown', 'plain'],
        }),
      )
      .subgraph((b) =>
        b.action(
          'load-images',
          {
            label: ['message-toolbar-load-images.menu', { ns: meta.id }],
            icon: loadRemoteImages ? 'ph--image--regular' : 'ph--image-broken--regular',
            iconOnly: true,
            checked: loadRemoteImages,
          },
          onToggleLoadImages,
        ),
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
  }, [
    viewMode,
    setViewMode,
    loadRemoteImages,
    onToggleLoadImages,
    enrichedAvailable,
    onOpen,
    onReply,
    onReplyAll,
    onForward,
    extractorActions,
  ]);
};
