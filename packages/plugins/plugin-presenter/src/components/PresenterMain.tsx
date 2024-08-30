//
// Copyright 2023 DXOS.org
//

import React, { type FC, useContext, useState } from 'react';

import {
  Surface,
  useIntentDispatcher,
  useResolvePlugin,
  parseLayoutPlugin,
  NavigationAction,
} from '@dxos/app-framework';
import { type CollectionType } from '@dxos/plugin-space/types';
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

const PresenterMain: FC<{ collection: CollectionType }> = ({ collection }) => {
  const [slide, setSlide] = useState(0);

  // TODO(burdon): Should not depend on split screen.
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const fullscreen = layoutPlugin?.provides.layout.layoutMode === 'fullscreen';
  const { running } = useContext(PresenterContext);

  // TODO(burdon): Currently conflates fullscreen and running.
  const dispatch = useIntentDispatcher();
  const handleSetRunning = (running: boolean) => {
    void dispatch([
      {
        plugin: PRESENTER_PLUGIN,
        action: TOGGLE_PRESENTATION,
        data: { state: running },
      },
      ...(!running
        ? [
            {
              action: NavigationAction.CLOSE,
              data: { activeParts: { fullScreen: fullyQualifiedId(collection) } },
            },
          ]
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
        bottomRight={<PageNumber index={slide} count={collection.objects.length} />}
        bottomLeft={
          <Pager
            index={slide}
            count={collection.objects.length}
            keys={running}
            onChange={setSlide}
            onExit={() => handleSetRunning(false)}
          />
        }
      >
        {/* TODO(wittjosiah): Better slide placeholder. */}
        <Surface role='slide' data={{ slide: collection.objects[slide] }} placeholder={<></>} />
      </Layout>
    </Main.Content>
  );
};

export default PresenterMain;
