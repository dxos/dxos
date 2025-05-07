//
// Copyright 2023 DXOS.org
//

import React, { type FC, useContext, useState } from 'react';

import { Surface, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type CollectionType } from '@dxos/plugin-space/types';
import { StackItem } from '@dxos/react-ui-stack';

import { Layout, PageNumber, Pager, StartButton } from './Presenter';
import { PresenterContext, PresenterAction } from '../types';

const PresenterMain: FC<{ collection: CollectionType }> = ({ collection }) => {
  const [slide, setSlide] = useState(0);

  const { running } = useContext(PresenterContext);

  // TODO(burdon): Currently conflates fullscreen and running.
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const handleSetRunning = (running: boolean) => {
    void dispatch(createIntent(PresenterAction.TogglePresentation, { object: collection, state: running }));
  };

  return (
    <StackItem.Content>
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
    </StackItem.Content>
  );
};

export default PresenterMain;
