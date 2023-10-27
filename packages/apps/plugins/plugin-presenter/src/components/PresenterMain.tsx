//
// Copyright 2023 DXOS.org
//

import React, { type FC, useContext, useState } from 'react';

import { useLayout } from '@braneframe/plugin-layout';
import { type Stack as StackType } from '@braneframe/types';
import { LayoutAction, Surface, useIntent } from '@dxos/app-framework';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { Layout, PageNumber, Pager, StartButton } from './Presenter';
import { PRESENTER_PLUGIN, PresenterContext } from '../types';

export const PresenterMain: FC<{ stack: StackType }> = ({ stack }) => {
  const [slide, setSlide] = useState(0);

  // TODO(burdon): Should not depend on split screen.
  const { fullscreen } = useLayout();

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
        action: LayoutAction.TOGGLE_FULLSCREEN,
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
        <Surface role='presenter-slide' data={{ slide: stack.sections[slide].object }} />
      </Layout>
    </Main.Content>
  );
};
