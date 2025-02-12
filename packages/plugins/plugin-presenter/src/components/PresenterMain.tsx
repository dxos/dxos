//
// Copyright 2023 DXOS.org
//

import React, { type FC, useContext, useState } from 'react';

import { Surface, createIntent, Capabilities, useCapability } from '@dxos/app-framework';
import { type CollectionType } from '@dxos/plugin-space/types';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { Layout, PageNumber, Pager, StartButton } from './Presenter';
import { PresenterContext, PresenterAction } from '../types';

const PresenterMain: FC<{ collection: CollectionType }> = ({ collection }) => {
  const [slide, setSlide] = useState(0);

  // TODO(burdon): Should not depend on split screen.
  const layout = useCapability(Capabilities.Layout);
  const fullscreen = layout.mode === 'fullscreen';
  const { running } = useContext(PresenterContext);

  // TODO(burdon): Currently conflates fullscreen and running.
  const { dispatchPromise: dispatch } = useCapability(Capabilities.IntentDispatcher);
  const handleSetRunning = (running: boolean) => {
    void dispatch(createIntent(PresenterAction.TogglePresentation, { object: collection, state: running }));
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
        <Surface role='slide' data={{ subject: collection.objects[slide] }} placeholder={<></>} />
      </Layout>
    </Main.Content>
  );
};

export default PresenterMain;
