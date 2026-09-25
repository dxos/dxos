//
// Copyright 2025 DXOS.org
//

import type * as AppGraph from '@dxos/app-graph/AppGraph';
import { MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu';
import { AI_ACTION_ICON } from '@dxos/ui-types';

import { meta } from '#meta';

import { deleteAction, openGroup } from '../Toolbar/index.ts';
import { type ExtractorMenuItem } from './useExtractorActions.tsx';

export type UseMessageToolbarActionsProps = {
  /** App graph used to source contributed (`disposition: 'toolbar'`) actions; omitted outside a plugin context. */
  graph?: AppGraph.ReadableGraph;
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
  /** Whether the message currently carries the `inbox` tag; picks the archive action's direction. */
  inInbox?: boolean;
  /** Toggles the message's `inbox` tag — archiving when it is in the inbox, restoring when it is not. */
  onArchive?: () => void;
  /** Creates a tracking Project from this message. */
  onCreateProject?: () => void;
  /** Contributed sender-scoped actions (research), already bound to this message's sender. */
  senderActions?: readonly { id: string; label: string; icon?: string; onSelect: () => void }[];
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
  inInbox,
  onArchive,
  onCreateProject,
  senderActions = [],
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
                  icon: AI_ACTION_ICON,
                  testId: 'inbox.message.aiReply',
                },
                onAiReply,
              );
            }

            // Message-disposition section (Gmail's grouping): archive and delete both take the message
            // out of the reading flow, so they share a section rather than sitting at opposite ends.
            // Archive is one toggle of the `inbox` tag — label and icon follow current membership.
            if (onArchive || onDelete) {
              if (onReply || onForward || onAiReply) {
                builder.separator('line');
              }
              if (onArchive) {
                builder.action(
                  'archive',
                  {
                    label: inInbox
                      ? ['message-toolbar-archive.menu', { ns: meta.profile.key }]
                      : ['message-toolbar-move-to-inbox.menu', { ns: meta.profile.key }],
                    icon: inInbox ? 'ph--archive--regular' : 'ph--tray--regular',
                    testId: 'inbox.message.archive',
                  },
                  onArchive,
                );
              }
              if (onDelete) {
                deleteAction(builder, { ns: meta.profile.key, labelKey: 'message-toolbar-delete.menu', onDelete });
              }
            }

            // Derive-something-from-this-message actions. Grouped with the contributed extractors
            // because they are the same gesture: turn this message into another object.
            if (onCreateProject || extractActions.length > 0 || senderActions.length > 0) {
              builder.separator('line');
            }
            if (onCreateProject) {
              builder.action(
                'create-project',
                {
                  label: ['message-toolbar-create-project.menu', { ns: meta.profile.key }],
                  icon: 'ph--stack--regular',
                  testId: 'inbox.message.createProject',
                },
                onCreateProject,
              );
            }

            // Sender-scoped actions contributed by other plugins (plugin-crm's research).
            for (const item of senderActions) {
              builder.action(
                `sender-${item.id}`,
                {
                  label: item.label,
                  icon: item.icon ?? 'ph--sparkle--regular',
                  testId: `inbox.message.sender.${item.id}`,
                },
                item.onSelect,
              );
            }

            // Extraction actions (trips, people, …) contributed for this message.
            if (extractActions.length > 0) {
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
          },
          'inbox.message.more',
        )
        .build(),
    [
      graph,
      nodeId,
      extractActions,
      onOpen,
      onReply,
      onReplyAll,
      onForward,
      onAiReply,
      inInbox,
      onArchive,
      onCreateProject,
      senderActions,
      onDelete,
    ],
  );
};
