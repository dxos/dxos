//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { useIntent } from '@braneframe/plugin-intent';
import { SPLITVIEW_PLUGIN, SplitViewAction, useSplitView } from '@braneframe/plugin-splitview';
import type { StackModel, StackProperties } from '@braneframe/plugin-stack';
import { Main } from '@dxos/aurora';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';

import { Deck } from './Presenter';
import { PRESENTER_PLUGIN } from '../types';

export const PresenterMain: FC<{ data: StackModel & StackProperties }> = ({ data: stack }) => {
  // TODO(burdon): Should not depend on split screen.
  const { fullscreen } = useSplitView();

  // TODO(burdon): Handle images and sketches (via surfaces?)
  // TODO(burdon): Order doesn't currently update when stack re-arranged.
  const slides = stack.sections.map((section) => String(section.object.content));

  // TODO(burdon): Currently conflates fullscreen and running.
  const { dispatch } = useIntent();
  const handleSetRunning = (running: boolean) => {
    void dispatch([
      {
        plugin: PRESENTER_PLUGIN,
        action: 'toggle-presentation',
        data: { state: running },
      },
      {
        plugin: SPLITVIEW_PLUGIN,
        action: SplitViewAction.TOGGLE_FULLSCREEN,
        data: { state: running },
      },
    ]);
  };

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, !fullscreen && coarseBlockPaddingStart]}>
      <Deck
        slides={slides}
        running={fullscreen}
        onStart={() => handleSetRunning(true)}
        onStop={() => handleSetRunning(false)}
      />
    </Main.Content>
  );
};
