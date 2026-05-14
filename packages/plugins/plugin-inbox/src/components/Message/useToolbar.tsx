//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { createGapSeparator, createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';

import { meta } from '#meta';

export type ViewMode = 'plain' | 'enriched' | 'plain-only';

/**
 * How the selected block's text is rendered.
 *   - `markdown`: parsed and decorated via the markdown extensions.
 *   - `plain`:    shown verbatim, no markdown parsing.
 */
export type RenderMode = 'markdown' | 'plain';

export type UseMessageToolbarActionsProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  renderMode: RenderMode;
  setRenderMode: (mode: RenderMode) => void;
  onOpen?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
};

export const useMessageActions = ({
  viewMode,
  setViewMode,
  renderMode,
  setRenderMode,
  onOpen,
  onReply,
  onReplyAll,
  onForward,
}: UseMessageToolbarActionsProps) => {
  const creator = useMemo(
    () =>
      Atom.make(() => {
        // TODO(burdon): Chainable builder pattern.
        const nodes = [];
        const edges = [];

        {
          nodes.push(
            createMenuItemGroup('root', {
              label: ['message-toolbar.label', { ns: meta.id }],
            }),
          );
        }

        if (onOpen) {
          const action = createMenuAction('open', onOpen, {
            label: ['message-toolbar-open.menu', { ns: meta.id }],
            icon: 'ph--arrow-square-out--regular',
          });
          nodes.push(action);
          edges.push({ source: 'root', target: action.id, relation: 'child' });
        }

        const gap = createGapSeparator();
        nodes.push(gap.nodes[0]);
        edges.push({ source: 'root', target: gap.nodes[0].id, relation: 'child' });

        // Reply actions.
        if (onReply) {
          const action = createMenuAction('reply', onReply, {
            label: ['message-toolbar-reply.menu', { ns: meta.id }],
            icon: 'ph--arrow-bend-up-left--regular',
          });
          nodes.push(action);
          edges.push({ source: 'root', target: action.id, relation: 'child' });
        }

        if (onReplyAll) {
          const action = createMenuAction('replyAll', onReplyAll, {
            label: ['message-toolbar-reply-all.menu', { ns: meta.id }],
            icon: 'ph--arrow-bend-double-up-left--regular',
          });
          nodes.push(action);
          edges.push({ source: 'root', target: action.id, relation: 'child' });
        }

        if (onForward) {
          const action = createMenuAction('forward', onForward, {
            label: ['message-toolbar-forward.menu', { ns: meta.id }],
            icon: 'ph--arrow-bend-up-right--regular',
          });
          nodes.push(action);
          edges.push({ source: 'root', target: action.id, relation: 'child' });
        }

        {
          const action = createMenuAction(
            'viewMode',
            () => {
              setViewMode(viewMode === 'plain' ? 'enriched' : 'plain');
            },
            {
              label: [
                viewMode === 'plain'
                  ? 'message toolbar show enriched message'
                  : viewMode === 'enriched'
                    ? 'message toolbar show plain message'
                    : 'message toolbar enriched message not available',
                { ns: meta.id },
              ],
              icon: viewMode === 'enriched' ? 'ph--article--regular' : 'ph--graph--regular',
            },
          );
          nodes.push(action);
          edges.push({ source: 'root', target: action.id, relation: 'child' });
        }

        // Render mode toggle: parse the body as markdown vs show it verbatim.
        {
          const action = createMenuAction(
            'renderMode',
            () => {
              setRenderMode(renderMode === 'markdown' ? 'plain' : 'markdown');
            },
            {
              label: [
                renderMode === 'markdown'
                  ? 'message toolbar show plain text'
                  : 'message toolbar show markdown',
                { ns: meta.id },
              ],
              icon: renderMode === 'markdown' ? 'ph--text-t--regular' : 'ph--markdown-logo--regular',
            },
          );
          nodes.push(action);
          edges.push({ source: 'root', target: action.id, relation: 'child' });
        }

        return { nodes, edges };
      }),
    [viewMode, setViewMode, renderMode, setRenderMode, onOpen, onReply, onReplyAll, onForward],
  );

  return useMenuActions(creator);
};
