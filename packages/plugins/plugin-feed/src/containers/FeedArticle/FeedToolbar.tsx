//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';

export type FeedToolbarProps = {
  attendableId?: string;
  onSync: () => void;
};

/**
 * Reactive feed toolbar built from the menu action-graph idiom: a single Sync action. Matches the
 * magazine/post toolbars; the feed's name is surfaced by the plank chrome, not duplicated here.
 */
export const FeedToolbar = ({ attendableId, onSync }: FeedToolbarProps) => {
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'sync',
          { label: ['sync-feed.label', { ns: meta.profile.key }], icon: 'ph--arrows-clockwise--regular', iconOnly: true },
          onSync,
        )
        .build(),
    [onSync],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Toolbar asChild>
        <Menu.Toolbar />
      </Panel.Toolbar>
    </Menu.Root>
  );
};

FeedToolbar.displayName = 'FeedToolbar';
