//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';

import { type PlayControl } from '../MediaArtifactArticle/MediaArtifactVariants.tsx';

export type EmptyPanelProps = {
  label: string;
  attendableId?: string;
  play?: PlayControl;
};

/** The storyboard's main panel with nothing to show: a message, and Play in the toolbar all the same. */
export const EmptyPanel = ({ label, attendableId, play }: EmptyPanelProps) => {
  const menuActions = useMenuBuilder((): ActionGraphProps => {
    const builder = MenuBuilder.make().separator('gap');
    if (play) {
      builder.action(
        'play',
        {
          label: ['play.label', { ns: meta.profile.key }],
          icon: 'ph--play--regular',
          disposition: 'toolbar',
          disabled: play.disabled,
        },
        play.onPlay,
      );
    }
    return builder.build();
  }, [play]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Toolbar>
      <Panel.Content>
        <Empty classNames='h-full' label={label} />
      </Panel.Content>
    </Panel.Root>
  );
};

EmptyPanel.displayName = 'EmptyPanel';
