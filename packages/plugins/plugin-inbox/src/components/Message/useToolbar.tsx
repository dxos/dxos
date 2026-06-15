//
// Copyright 2025 DXOS.org
//

import { type Graph, type Node } from '@dxos/app-graph';
import { MenuBuilder, graphActions, useMenuBuilder } from '@dxos/react-ui-menu';
import { type Message } from '@dxos/types';

import { meta } from '#meta';

import { deleteGroup, openGroup } from '../Toolbar';
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
  onDelete?: () => void;
};

export const useMessageActions = ({
  graph,
  nodeId,
  message,
  viewMode,
  setViewMode,
  loadRemoteImages,
  onToggleLoadImages,
  onOpen,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
}: UseMessageToolbarActionsProps) => {
  const extractorActions = useExtractorActions(message);

  // The enriched option is only offered when the message carries a non-empty enriched (second) block.
  const enrichedAvailable = (() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    return textBlocks.length > 1 && !!textBlocks[1]?.text;
  })();

  return useMenuBuilder(
    (get) => {
      let builder = MenuBuilder.make()
        .root({ label: ['message-toolbar.label', { ns: meta.id }] })
        .subgraph(onOpen && openGroup({ ns: meta.id, labelKey: 'message-toolbar-open.menu', onOpen }))
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
        )
        .subgraph(onDelete && deleteGroup({ ns: meta.id, labelKey: 'message-toolbar-delete.menu', onDelete }))
        // Actions other plugins contribute onto the message node.
        .subgraph(graphActions(graph, get, nodeId, { filter: isToolbarAction }));

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
    },
    [
      graph,
      nodeId,
      viewMode,
      setViewMode,
      loadRemoteImages,
      onToggleLoadImages,
      enrichedAvailable,
      onOpen,
      onReply,
      onReplyAll,
      onForward,
      onDelete,
      extractorActions,
    ],
  );
};
