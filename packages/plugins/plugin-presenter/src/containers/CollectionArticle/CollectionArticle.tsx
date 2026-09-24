//
// Copyright 2023 DXOS.org
//

import React, { useContext, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Collection, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';

import { PageNumber, Pager, PresentationShell, PresenterContext, Layout as PresenterLayout } from '#components';

import { useExitPresenter } from '../../useExitPresenter.ts';

export type CollectionArticleProps = AppSurface.ObjectArticleProps<Collection.Collection>;

export const CollectionArticle = ({ role, subject: collection }: CollectionArticleProps) => {
  const [slide, setSlide] = useState(0);
  const { running } = useContext(PresenterContext);
  const handleExit = useExitPresenter(collection);
  const [liveCollection] = useObject(collection);

  return (
    <Panel.Root role={role} classNames='relative'>
      <Panel.Content asChild>
        <PresentationShell onExit={handleExit}>
          <PresenterLayout
            bottomRight={<PageNumber index={slide} count={liveCollection.objects.length} />}
            bottomLeft={
              <Pager index={slide} count={liveCollection.objects.length} keys={running} onChange={setSlide} />
            }
          >
            <Surface.Surface
              type={AppSurface.Slide}
              data={{
                subject: liveCollection.objects[slide],
                attendableId: Obj.getURI(collection),
              }}
            />
          </PresenterLayout>
        </PresentationShell>
      </Panel.Content>
    </Panel.Root>
  );
};

CollectionArticle.displayName = 'CollectionArticle';
