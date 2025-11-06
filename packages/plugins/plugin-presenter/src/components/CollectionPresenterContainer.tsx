//
// Copyright 2023 DXOS.org
//

import React, { type FC, useContext, useState } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { PresenterContext } from '../types';
import { useExitPresenter } from '../useExitPresenter';

import { Layout, PageNumber, Pager } from './Presenter';

const CollectionPresenterContainer: FC<{
  collection: DataType.Collection.Collection;
}> = ({ collection }) => {
  const [slide, setSlide] = useState(0);

  const { running } = useContext(PresenterContext);

  const handleExit = useExitPresenter(collection);

  return (
    <StackItem.Content classNames='relative'>
      <Layout
        bottomRight={<PageNumber index={slide} count={collection.objects.length} />}
        bottomLeft={
          <Pager
            index={slide}
            count={collection.objects.length}
            keys={running}
            onChange={setSlide}
            onExit={handleExit}
          />
        }
      >
        {/* TODO(wittjosiah): Better slide placeholder. */}
        <Surface role='slide' data={{ subject: collection.objects[slide] }} placeholder={<></>} />
      </Layout>
    </StackItem.Content>
  );
};

export default CollectionPresenterContainer;
