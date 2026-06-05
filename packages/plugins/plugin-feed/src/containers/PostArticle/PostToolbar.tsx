//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import React from 'react';

import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { type Subscription } from '#types';

import { postReadAtom, postTagsAtom } from '../../state';

export type PostToolbarProps = {
  post: Subscription.Post;
  /** Whether a content re-fetch is in flight. */
  refreshingAtom: Atom.Atom<boolean>;
  attendableId?: string;
  onSetStarred: (value: boolean) => void;
  onSetArchived: (value: boolean) => void;
  onMarkUnread: () => void;
  onRefresh: () => void;
  onOpenOriginal: () => void;
};

/**
 * Reactive post toolbar built from the menu action-graph idiom. The action graph reads the post's
 * star/archive/read slices (and the refreshing flag) via `get` inside the builder, so it subscribes
 * to those atoms and rebuilds whenever this post's state changes. Deps hold only stable references
 * (the post, the refreshing atom, callbacks), never the reactive values.
 */
export const PostToolbar = ({
  post,
  refreshingAtom,
  attendableId,
  onSetStarred,
  onSetArchived,
  onMarkUnread,
  onRefresh,
  onOpenOriginal,
}: PostToolbarProps) => {
  const menuActions = useMenuBuilder(
    (get) => {
      const { starred, archived } = get(postTagsAtom(post));
      const { readAt } = get(postReadAtom(post));
      const read = readAt !== undefined;
      const refreshing = get(refreshingAtom);
      const hasLink = Boolean(post.link);

      return (
        MenuBuilder.make()
          .action(
            'star',
            {
              label: [starred ? 'unstar-post.label' : 'star-post.label', { ns: meta.id }],
              icon: starred ? 'ph--star--fill' : 'ph--star--regular',
              iconOnly: true,
            },
            () => onSetStarred(!starred),
          )
          .action(
            'archive',
            {
              label: [archived ? 'unarchive-post.label' : 'archive-post.label', { ns: meta.id }],
              icon: archived ? 'ph--archive--fill' : 'ph--archive--regular',
              iconOnly: true,
            },
            () => onSetArchived(!archived),
          )
          .action(
            'mark-unread',
            {
              label: ['mark-unread.label', { ns: meta.id }],
              icon: 'ph--envelope--regular',
              iconOnly: true,
              hidden: !read,
            },
            onMarkUnread,
          )
          // `gap` is a flexible spacer that pushes the link actions to the trailing edge.
          .separator('gap')
          .action(
            'refresh',
            {
              label: [refreshing ? 'refresh-content-pending.label' : 'refresh-content.label', { ns: meta.id }],
              icon: 'ph--arrows-clockwise--regular',
              iconClassNames: refreshing ? 'animate-spin' : undefined,
              iconOnly: true,
              disabled: refreshing,
              hidden: !hasLink,
            },
            onRefresh,
          )
          .action(
            'open-original',
            {
              label: ['open-original.label', { ns: meta.id }],
              icon: 'ph--arrow-square-out--regular',
              iconOnly: true,
              hidden: !hasLink,
            },
            onOpenOriginal,
          )
          .build()
      );
    },
    [post, refreshingAtom, onSetStarred, onSetArchived, onMarkUnread, onRefresh, onOpenOriginal],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Toolbar asChild>
        <Menu.Toolbar />
      </Panel.Toolbar>
    </Menu.Root>
  );
};

PostToolbar.displayName = 'PostToolbar';
