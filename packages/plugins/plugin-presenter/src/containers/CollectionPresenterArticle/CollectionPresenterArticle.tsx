//
// Copyright 2023 DXOS.org
//

import React, { useContext, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Collection, Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';

import { PageNumber, Pager, Layout as PresenterLayout } from '#components';
import { PresenterContext } from '#types';

import { useExitPresenter } from '../../useExitPresenter';

export type CollectionPresenterArticleProps = AppSurface.ObjectArticleProps<Collection.Collection>;

export const CollectionPresenterArticle = ({ role, subject: collection }: CollectionPresenterArticleProps) => {
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
          <Surface.Surface
            type={AppSurface.Slide}
            data={{
              subject: collection.objects[slide],
              attendableId: Obj.getURI(collection),
            }}
          />
        </PresenterLayout>
      </Panel.Content>
    </Panel.Root>
  );
};
