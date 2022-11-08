//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import cx from 'classnames';
import { CaretLeft, Planet, Plus, Rocket } from 'phosphor-react';
import React from 'react';
import { HashRouter, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import urlJoin from 'url-join';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Client, fromIFrame, InvitationEncoder, Item } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import { ServiceWorkerToast, SpaceList, useSafeSpaceKey } from '@dxos/react-appkit';
import { ClientProvider, useClient, useParties, useParty, useProfile, useSelection } from '@dxos/react-client';
import { Composer, DOCUMENT_TYPE } from '@dxos/react-composer';
import {
  Button,
  getSize,
  Heading,
  JoinSpaceDialog,
  Loading,
  Presence,
  Tooltip,
  UiKitProvider,
  useTranslation
} from '@dxos/react-uikit';
import { TextModel } from '@dxos/text-model';
import { humanize } from '@dxos/util';

import translationResources from './translations';

const configProvider = async () => new Config(await Dynamics(), Defaults());

const clientProvider = async () => {
  const config = await configProvider();
  const client = new Client({ config, services: fromIFrame(config) });
  await client.initialize();
  return client;
};

export const App = () => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({ onRegisterError: (err) => console.error(err) });

  return (
    <UiKitProvider resourceExtensions={translationResources}>
      <ClientProvider client={clientProvider}>
        <HashRouter>
          <Routes>
            <Route path='/' element={<SpacesView />} />
            <Route path='/spaces/:space' element={<SpaceView />} />
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

const SpacesView = () => {
  const client = useClient();
  const spaces = useParties();
  const profile = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationParam = searchParams.get('invitation');
  const { t } = useTranslation('hello');

  const handleOpenHalo = () => {
    const remoteSource = client.config.get('runtime.client.remoteSource')?.split('/').slice(0, -1).join('/');
    const tab = window.open(remoteSource ?? 'https://halo.dxos.org', '_blank');
    tab?.focus();
  };

  const handleCreateSpace = async () => {
    // 1. Create party.
    const space = await client.echo.createParty();

    // 2. Create item.
    await space.database.createItem({
      model: TextModel,
      type: DOCUMENT_TYPE
    });
  };

  if (!profile) {
    return (
      <main className='max-is-lg mli-auto pli-7 mbs-7 space-b-6'>
        <div role='none' className={cx('flex flex-wrap items-center justify-center gap-x-2 gap-y-4 my-4')}>
          <Heading>{t('hello label')}</Heading>
          <p className='text-center'>{t('no identity label')}</p>
          <Button onClick={handleOpenHalo}>{t('go to halo label')}</Button>
        </div>
      </main>
    );
  }

  return (
    <main className='max-is-5xl mli-auto pli-7'>
      <div role='none' className={cx('flex flex-wrap items-center gap-x-2 gap-y-4 my-4')}>
        <Heading>{t('spaces label')}</Heading>
        <div role='none' className='grow-[99] min-w-[2rem]' />
        <div role='none' className='grow flex gap-2'>
          {/* 5. Joining. */}
          <JoinSpaceDialog
            initialInvitationCode={invitationParam ?? undefined}
            parseInvitation={(invitationCode) => invitationCodeFromUrl(invitationCode)}
            onJoin={(space) => navigate(`/${space.toHex()}`)}
            dialogProps={{
              initiallyOpen: Boolean(invitationParam),
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

const invitationCodeFromUrl = (text: string) => {
  try {
    const searchParams = new URLSearchParams(text.substring(text.lastIndexOf('?')));
    const invitation = searchParams.get('invitation');
    return invitation ?? text;
  } catch (err) {
    log.error(err);
    return text;
  }
};

const SpaceView = () => {
  const { t } = useTranslation('hello');
  const navigate = useNavigate();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex, () => navigate('/'));
  const space = useParty(spaceKey);
  const profile = useProfile();

  // 3. Select items.
  const [item] = useSelection<Item<TextModel>>(space?.select().filter({ type: DOCUMENT_TYPE })) ?? [];

  if (!space) {
    return null;
  }

  return (
    <main className='max-is-5xl mli-auto pli-7'>
      <div role='none' className={cx('flex flex-wrap items-center gap-x-2 gap-y-4 my-4')}>
        <Tooltip content={t('back to spaces label')} side='right' tooltipLabelsTrigger>
          <Button compact onClick={() => navigate('/')} className='flex gap-1'>
            <CaretLeft className={getSize(4)} />
            <Planet className={getSize(4)} />
          </Button>
        </Tooltip>
        <Heading className='truncate pbe-1'>{humanize(space.key)}</Heading>
        <div role='none' className='grow-[99] min-w-[2rem]' />
        <div role='none' className='grow flex gap-2'>
          {/* 4. Sharing. */}
          <Presence
            profile={profile!}
            space={space}
            createInvitationUrl={(invitation) => {
              const { origin, pathname } = window.location;
              return urlJoin(origin, pathname, `/#?invitation=${InvitationEncoder.encode(invitation)}`);
            }}
            className='flex-none'
            size={10}
            sideOffset={4}
          />
        </div>
      </div>
      {item ? <Composer item={item} className='z-0' /> : <Loading label={t('generic loading label')} size='md' />}
    </main>
  );
};
