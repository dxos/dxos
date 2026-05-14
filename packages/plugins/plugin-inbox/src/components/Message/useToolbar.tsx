//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';

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
      Atom.make(() =>
        MenuBuilder.make()
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
          .action(
            'renderMode',
            {
              label: [
                renderMode === 'markdown' ? 'message toolbar show plain text' : 'message toolbar show markdown',
                { ns: meta.id },
              ],
              icon: renderMode === 'markdown' ? 'ph--text-t--regular' : 'ph--markdown-logo--regular',
            },
            () => setRenderMode(renderMode === 'markdown' ? 'plain' : 'markdown'),
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
          .action(
            'viewMode',
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
            () => setViewMode(viewMode === 'plain' ? 'enriched' : 'plain'),
          )
          .build(),
      ),
    [viewMode, setViewMode, renderMode, setRenderMode, onOpen, onReply, onReplyAll, onForward],
  );

  return useMenuActions(creator);
};
