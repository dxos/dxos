//
// Copyright 2023 DXOS.org
//

import React, { type FC, useContext, useState } from 'react';

import { useIntent } from '@braneframe/plugin-intent';
import { SPLITVIEW_PLUGIN, SplitViewAction, useSplitView } from '@braneframe/plugin-splitview';
import type { StackModel, StackProperties } from '@braneframe/plugin-stack';
import { Main } from '@dxos/aurora';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { Surface } from '@dxos/react-surface';

import { Layout, PageNumber, Pager, StartButton } from './Presenter';
import { PRESENTER_PLUGIN, PresenterContext } from '../types';

export const PresenterMain: FC<{ data: StackModel & StackProperties }> = ({ data: stack }) => {
  const [slide, setSlide] = useState(0);

  // TODO(burdon): Should not depend on split screen.
  const { fullscreen } = useSplitView();

  const { running } = useContext(PresenterContext);

  // TODO(burdon): Currently conflates fullscreen and running.
  const { dispatch } = useIntent();
  const handleSetRunning = (running: boolean) => {
    void dispatch([
      {
        plugin: PRESENTER_PLUGIN,
        action: 'toggle-presentation', // TODO(burdon): Create const.
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
      <Layout
        topRight={<StartButton running={running} onClick={(running) => handleSetRunning(running)} />}
        bottomRight={<PageNumber index={slide} count={stack.sections.length} />}
        bottomLeft={
          <Pager
            index={slide}
            count={stack.sections.length}
            keys={running}
            onChange={setSlide}
            onExit={() => handleSetRunning(false)}
          />
        }
      >
        <Surface role='presenter-slide' data={stack.sections[slide].object} />
      </Layout>
    </Main.Content>
  );
};
