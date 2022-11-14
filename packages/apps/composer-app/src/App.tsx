//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import type { Item, Space } from '@dxos/client';
import { AppShell, ServiceWorkerToast } from '@dxos/react-appkit';
import { useSelection } from '@dxos/react-client';
import { Composer, DOCUMENT_TYPE } from '@dxos/react-composer';
import { Loading, useTranslation } from '@dxos/react-uikit';
import { TextModel } from '@dxos/text-model';

const SpacePage = () => {
  const { t } = useTranslation();
  const { space } = useOutletContext<{ space: Space }>();

  const [item] = useSelection<Item<TextModel>>(space?.select().filter({ type: DOCUMENT_TYPE })) ?? [];

  return item ? <Composer item={item} className='z-0' /> : <Loading label={t('generic loading label')} size='md' />;
};

export const App = () => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({ onRegisterError: (err) => console.error(err) });

  const handleSpaceCreate = async (space: Space) => {
    await space.database.createItem({
      model: TextModel,
      type: DOCUMENT_TYPE
    });
  };

  return (
    <>
      <AppShell
        globalContent={
          needRefresh ? (
            <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
          ) : offlineReady ? (
            <ServiceWorkerToast variant='offlineReady' />
          ) : null
        }
        spaceElement={<SpacePage />}
        onSpaceCreate={handleSpaceCreate}
      />
    </>
  );
};
