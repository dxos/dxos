//
// Copyright 2023 DXOS.org
//

import React, { useContext, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit';
import { type Collection } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';

import { PageNumber, Pager, Layout as PresenterLayout } from '#components';
import { PresenterContext } from '#types';
import { useExitPresenter } from '../../useExitPresenter';

type CollectionPresenterContainerProps = AppSurface.ObjectProps<Collection.Collection>;

export const CollectionPresenterContainer = ({ role, subject: collection }: CollectionPresenterContainerProps) => {
  const [slide, setSlide] = useState(0);
  const { running } = useContext(PresenterContext);
  const handleExit = useExitPresenter(collection);

  return (
    <Panel.Root role={role} classNames='relative'>
      <Panel.Content asChild>
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
      </Panel.Content>
    </Panel.Root>
  );
};
