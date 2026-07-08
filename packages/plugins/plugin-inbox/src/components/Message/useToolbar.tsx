//
// Copyright 2025 DXOS.org
//

import { type Graph, type Node } from '@dxos/app-graph';
import { MenuBuilder, graphActions, useMenuBuilder } from '@dxos/react-ui-menu';
import { type Message } from '@dxos/types';

import { meta } from '#meta';

import { deleteAction, openGroup } from '../Toolbar';
import { type ViewMode, viewModeGroup } from '../ViewMode';
import { useExtractorActions } from './useExtractorActions';

/** Contributed actions opt into the toolbar via `disposition: 'toolbar'` (vs context-menu-only). */
const isToolbarAction = (action: Node.ActionLike) => action.properties.disposition === 'toolbar';

export type UseMessageToolbarActionsProps = {
  /** App graph used to source contributed (`disposition: 'toolbar'`) actions; omitted outside a plugin context. */
  graph?: Graph.ReadableGraph;
  /** Graph node id of the message (its URI / attendableId); contributed actions hang off this. */
  nodeId?: string;
  message: Message.Message;
  /** Whether remote images are currently loaded inline. */
  loadRemoteImages: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /** Toggle the remote-image loading setting. */
  onToggleLoadImages: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  /** Generates an AI reply draft grounded on thread context and known facts. */
  onAiReply?: () => void;
};

export const useMessageActions = ({
  graph,
  nodeId,
  message,
  loadRemoteImages,
  viewMode,
  setViewMode,
  onToggleLoadImages,
  onOpen,
  onDelete,
  onReply,
  onReplyAll,
  onForward,
  onAiReply,
}: UseMessageToolbarActionsProps) => {
  const extractorActions = useExtractorActions(message);

  // The enriched option is only offered when the message carries a non-empty enriched (second) block.
  const enrichedAvailable = (() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    return textBlocks.length > 1 && !!textBlocks[1]?.text;
  })();

  return useMenuBuilder(
    (get) =>
      MenuBuilder.make()
        .root({ label: ['message-toolbar.label', { ns: meta.profile.key }] })
        .subgraph(onOpen && openGroup({ ns: meta.profile.key, labelKey: 'message-toolbar-open.menu', onOpen }))
        .subgraph(
          viewModeGroup({
            ns: meta.profile.key,
            viewMode,
            setViewMode,
            modes: enrichedAvailable ? ['enriched', 'markdown', 'plain'] : ['markdown', 'plain'],
          }),
        )
        .subgraph((b) =>
          b.action(
            'load-images',
            {
              label: ['message-toolbar-load-images.menu', { ns: meta.profile.key }],
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
                  label: ['message-toolbar-reply.menu', { ns: meta.profile.key }],
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
                  label: ['message-toolbar-reply-all.menu', { ns: meta.profile.key }],
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
                  label: ['message-toolbar-forward.menu', { ns: meta.profile.key }],
                  icon: 'ph--arrow-bend-up-right--regular',
                },
                onForward,
              )),
        )
        .subgraph(
          onAiReply &&
            ((b) =>
              b.action(
                'ai-reply',
                {
                  label: ['message-toolbar-ai-reply.menu', { ns: meta.profile.key }],
                  icon: 'ph--sparkle--regular',
                },
                onAiReply,
              )),
        )
        .separator()
        .subgraph((b) => {
          if (extractorActions.length > 0) {
            return b.group(
              'extract',
              {
                label: ['message-toolbar-extract.menu', { ns: meta.profile.key }],
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
        })
        .menu('more', (b) => {
          // Actions contributed by other plugins.
          b.subgraph(graphActions(graph, get, nodeId, { filter: isToolbarAction }));

          if (onDelete) {
            deleteAction(b, { ns: meta.profile.key, labelKey: 'message-toolbar-delete.menu', onDelete });
          }
        })
        .build(),
    [
      graph,
      nodeId,
      viewMode,
      setViewMode,
      loadRemoteImages,
      enrichedAvailable,
      extractorActions,
      onToggleLoadImages,
      onOpen,
      onReply,
      onReplyAll,
      onForward,
      onAiReply,
      onDelete,
    ],
  );
};
