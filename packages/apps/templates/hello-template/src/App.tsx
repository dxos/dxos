//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import cx from 'classnames';
import { CaretLeft, Planet, Plus, Rocket } from 'phosphor-react';
import React from 'react';
import { HashRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Item } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { ServiceWorkerToast, SpaceList, useSafeSpaceKey } from '@dxos/react-appkit';
import { ClientProvider, useClient, useParties, useParty, useSelection } from '@dxos/react-client';
import { Composer, DOCUMENT_TYPE } from '@dxos/react-composer';
import {
  Button,
  getSize,
  Heading,
  JoinSpaceDialog,
  Loading,
  Tooltip,
  UiKitProvider,
  useTranslation
} from '@dxos/react-uikit';
import { TextModel } from '@dxos/text-model';
import { humanize } from '@dxos/util';

import translationResources from './translations';

const configProvider = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({ onRegisterError: (err) => console.error(err) });

  return (
    <UiKitProvider resourceExtensions={translationResources}>
      <ClientProvider config={configProvider}>
        <HashRouter>
          <Routes>
            <Route path='/' element={<SpacesView />} />
            <Route path='/:space' element={<SpaceView />} />
          </Routes>
        </HashRouter>
      </ClientProvider>

      {needRefresh ? (
        <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
      ) : offlineReady ? (
        <ServiceWorkerToast variant='offlineReady' />
      ) : null}
    </UiKitProvider>
  );
};

export const SpacesView = () => {
  const client = useClient();
  const spaces = useParties();
  const navigate = useNavigate();
  const { t } = useTranslation('hello');

  const handleCreateSpace = async () => {
    // 1. Create party.
    const space = await client.echo.createParty();

    // 2. Create item.
    await space.database.createItem({
      model: TextModel,
      type: DOCUMENT_TYPE
    });
  };

  return (
    <main className='max-is-5xl mli-auto pli-7'>
      <div role='none' className={cx('flex flex-wrap items-center gap-x-2 gap-y-4')}>
        <Heading>{t('spaces label')}</Heading>
        <div role='none' className='grow-[99] min-w-[2rem]' />
        <div role='none' className='grow flex gap-2'>
          {/* 5. Joining. */}
          <JoinSpaceDialog
            onJoin={(space) => navigate(`/${space.key.toHex()}`)}
            dialogProps={{
              openTrigger: (
                <Button className='grow flex gap-1'>
                  <Rocket className={getSize(5)} />
                  {t('join space label', { ns: 'uikit' })}
                </Button>
              )
            }}
          />
          <Button variant='primary' onClick={handleCreateSpace} className='grow flex gap-1'>
            <Plus className={getSize(5)} />
            {t('create space label', { ns: 'uikit' })}
          </Button>
        </div>
      </div>

      {spaces?.length > 0 && <SpaceList spaces={spaces} />}
    </main>
  );
};

const SpaceView = () => {
  const { t } = useTranslation('hello');
  const navigate = useNavigate();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex);
  const space = useParty(spaceKey);

  // 3. Select items.
  const [item] = useSelection<Item<TextModel>>(space?.select().filter({ type: DOCUMENT_TYPE })) ?? [];

  if (!space) {
    return null;
  }

  return (
    <>
      <div role='none' className='fixed block-start-6 inset-inline-24 flex gap-2 justify-center items-center z-[1]'>
        <Heading className='truncate pbe-1'>{humanize(space.key)}</Heading>
        {/* 4. TODO(wittjosiah): Sharing. */}
      </div>
      <div role='none' className='fixed block-start-7 inline-start-7 mlb-px'>
        <Tooltip content={t('back to spaces label')} side='right' tooltipLabelsTrigger>
          <Button compact onClick={() => navigate('/spaces')} className='flex gap-1'>
            <CaretLeft className={getSize(4)} />
            <Planet className={getSize(4)} />
          </Button>
        </Tooltip>
      </div>
      <main className='max-is-5xl mli-auto pli-7'>
        {item ? <Composer item={item} className='z-0' /> : <Loading label={t('generic loading label')} size='md' />}
      </main>
    </>
  );
};
