//
// Copyright 2025 DXOS.org
//

import { type Graph } from '@dxos/app-graph';
import { MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';

import { deleteAction, openGroup } from '../Toolbar';
import { type ExtractorMenuItem } from './useExtractorActions';

export type UseMessageToolbarActionsProps = {
  /** App graph used to source contributed (`disposition: 'toolbar'`) actions; omitted outside a plugin context. */
  graph?: Graph.ReadableGraph;
  /** Graph node id of the message (its URI / attendableId); contributed actions hang off this. */
  nodeId?: string;
  /** Pre-built extract menu items (container-resolved from the object extractors + operation invoker). */
  extractActions?: readonly ExtractorMenuItem[];
  onOpen?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  /** Generates an AI reply draft grounded on thread context and known facts. */
  onAiReply?: () => void;
};

/**
 * Body view controls (view-mode switch, load-images) apply to the whole conversation, so they live on
 * the thread toolbar (see {@link useThreadViewActions}), not here — this builds only the per-message
 * actions (reply/forward/…) that target the individual message.
 */
export const useMessageActions = ({
  graph,
  nodeId,
  extractActions = [],
  onOpen,
  onDelete,
  onReply,
  onReplyAll,
  onForward,
  onAiReply,
}: UseMessageToolbarActionsProps) => {
  return useMenuBuilder(
    (get) =>
      MenuBuilder.make()
        .root({ label: ['message-toolbar.label', { ns: meta.profile.key }] })
        // Gmail pattern: Reply All is the single visible action; everything else lives in the
        // overflow menu so the per-message toolbar stays compact. (The tile right-aligns the toolbar.)
        .subgraph(
          onReplyAll &&
            ((builder) =>
              builder.action(
                'replyAll',
                {
                  label: ['message-toolbar-reply-all.menu', { ns: meta.profile.key }],
                  icon: 'ph--arrow-bend-double-up-left--regular',
                  testId: 'inbox.message.replyAll',
                },
                onReplyAll,
              )),
        )
        // Overflow menu grouped into sections (reply · extract · open/plugin · delete) separated by
        // dividers. Each divider is guarded on its section having content so no stray dividers appear.
        .menu(
          'more',
          (builder) => {
            // Reply / Forward / AI reply.
            if (onReply) {
              builder.action(
                'reply',
                {
                  label: ['message-toolbar-reply.menu', { ns: meta.profile.key }],
                  icon: 'ph--arrow-bend-up-left--regular',
                  testId: 'inbox.message.reply',
                },
                onReply,
              );
            }
            if (onForward) {
              builder.action(
                'forward',
                {
                  label: ['message-toolbar-forward.menu', { ns: meta.profile.key }],
                  icon: 'ph--arrow-bend-up-right--regular',
                  testId: 'inbox.message.forward',
                },
                onForward,
              );
            }
            if (onAiReply) {
              builder.action(
                'ai-reply',
                {
                  label: ['message-toolbar-ai-reply.menu', { ns: meta.profile.key }],
                  icon: 'ph--sparkle--regular',
                  testId: 'inbox.message.aiReply',
                },
                onAiReply,
              );
            }

            // Extraction actions (trips, people, …) contributed for this message.
            if (extractActions.length > 0) {
              builder.separator('line');
              for (const item of extractActions) {
                builder.action(
                  `extract-${item.id}`,
                  {
                    label: item.label,
                    icon: 'ph--magic-wand--regular',
                  },
                  item.onSelect,
                );
              }
            }

            // Open, plus actions contributed by other plugins.
            if (onOpen) {
              builder.separator('line');
              openGroup({ ns: meta.profile.key, labelKey: 'message-toolbar-open.menu', onOpen })(builder);
            }
            builder.subgraph(graphActions(graph, get, nodeId, { filter: isToolbarAction, rootId: 'more' }));

            // Destructive.
            if (onDelete) {
              builder.separator('line');
              deleteAction(builder, { ns: meta.profile.key, labelKey: 'message-toolbar-delete.menu', onDelete });
            }
          },
          'inbox.message.more',
        )
        .build(),
    [graph, nodeId, extractActions, onOpen, onReply, onReplyAll, onForward, onAiReply, onDelete],
  );
};
