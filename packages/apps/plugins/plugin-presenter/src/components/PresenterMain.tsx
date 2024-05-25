//
// Copyright 2023 DXOS.org
//

import React, { type FC, useContext, useState } from 'react';

import { type StackType } from '@braneframe/types';
import { Surface, useIntent, useResolvePlugin, parseLayoutPlugin, NavigationAction } from '@dxos/app-framework';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { Layout, PageNumber, Pager, StartButton } from './Presenter';
import { PRESENTER_PLUGIN } from '../meta';
import { PresenterContext, TOGGLE_PRESENTATION } from '../types';

const PresenterMain: FC<{ stack: StackType }> = ({ stack }) => {
  const [slide, setSlide] = useState(0);

  // TODO(burdon): Should not depend on split screen.
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const fullscreen = layoutPlugin?.provides.layout.fullscreen;

  const { running } = useContext(PresenterContext);

  // TODO(burdon): Currently conflates fullscreen and running.
  const { dispatch } = useIntent();
  const handleSetRunning = (running: boolean) => {
    void dispatch([
      {
        plugin: PRESENTER_PLUGIN,
        action: TOGGLE_PRESENTATION,
        data: { state: running },
      },
      ...(!running
        ? [{ action: NavigationAction.CLOSE, data: { activeParts: { fullScreen: fullyQualifiedId(stack) } } }]
        : []),
    ]);
  };

  return (
    <Main.Content
      classNames={[
        baseSurface,
        fixedInsetFlexLayout,
        !fullscreen && topbarBlockPaddingStart,
        !fullscreen && bottombarBlockPaddingEnd,
      ]}
    >
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
        {/* TODO(wittjosiah): Better slide placeholder. */}
        <Surface role='slide' data={{ slide: stack.sections[slide]?.object }} placeholder={<></>} />
      </Layout>
    </Main.Content>
  );
};

export default PresenterMain;
