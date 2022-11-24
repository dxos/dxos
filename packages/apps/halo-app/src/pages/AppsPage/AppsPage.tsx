//
// Copyright 2022 DXOS.org
//

import { Plus } from 'phosphor-react';
import React, { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { QueryObservable } from '@dxos/metagraph';
import { Module } from '@dxos/protocols/proto/dxos/config';
import { HeadingWithActions } from '@dxos/react-appkit';
import { useMetagraph } from '@dxos/react-client';
import { useTranslation, Button, getSize } from '@dxos/react-uikit';

import { AppList, AppProps } from '../../components';

export const AppsPage = () => {
  const { t } = useTranslation('halo');

  // TODO(burdon): Factor out separate hook?
  const metagraph = useMetagraph();
  const [apps, setApps] = useState<AppProps[]>([]);
  const [observable, setObservable] = useState<QueryObservable<Module>>();
  useEffect(() => {
    if (!metagraph) {
      return;
    }

    let unsubscribe: () => void | undefined;
    setTimeout(async () => {
      // TODO(burdon): Change tags to 'showcase' once apps re redeployed.
      const tags: string[] = [];
      const observable = await metagraph.modules.query({ tags });
      setObservable(observable);
      unsubscribe = observable.subscribe({
        onUpdate: (modules) => {
          log('modules query', { modules });
          setApps(
            modules.map((module) => ({
              module,
              launchUrl: `https://${module.name}.dxos.org` // TODO(burdon): KUBE should add url to module def.
            }))
          );
        }
      });

      observable.fetch();
    });

    return () => unsubscribe?.();
  }, [metagraph]);

  return (
    <main className='max-is-5xl mli-auto pli-7'>
      <HeadingWithActions
        heading={{ children: t('apps label') }}
        actions={
          <Button
            variant='primary'
            className='grow flex gap-1'
            onClick={() => {
              observable?.fetch();
            }}
          >
            <Plus className={getSize(5)} />
            {t('refresh app list label')}
          </Button>
        }
      />
      <AppList apps={apps} />
    </main>
  );
};
