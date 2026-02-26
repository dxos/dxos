//
// Copyright 2023 DXOS.org
//

import React, { useContext, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Layout } from '@dxos/react-ui';
import { type Collection } from '@dxos/schema';

import { PageNumber, Pager, Layout as PresenterLayout } from '../../components/Presenter';
import { PresenterContext } from '../../types';
import { useExitPresenter } from '../../useExitPresenter';

type CollectionPresenterContainerProps = SurfaceComponentProps<Collection.Collection>;

export const CollectionPresenterContainer = ({ role, subject: collection }: CollectionPresenterContainerProps) => {
  const [slide, setSlide] = useState(0);
  const { running } = useContext(PresenterContext);
  const handleExit = useExitPresenter(collection);

  return (
    <Layout.Main role={role} classNames='relative'>
      <PresenterLayout
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
        <Surface.Surface role='slide' data={{ subject: collection.objects[slide] }} />
      </PresenterLayout>
    </Layout.Main>
  );
};
