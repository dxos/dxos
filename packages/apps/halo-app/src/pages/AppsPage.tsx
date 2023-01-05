//
// Copyright 2022 DXOS.org
//

import React, { useMemo } from 'react';

import { Heading, Loading, useTranslation } from '@dxos/react-ui';

import { AppList, AppProps } from '../components';
import { useModules } from '../experimental';

const AppsPage = () => {
  const { t } = useTranslation('halo');
  const { modules, isLoading } = useModules(['showcase'], 1_000);
  const apps = useMemo<AppProps[]>(
    () =>
      modules.map((module) => ({
        module,
        // TODO(burdon): KUBE should add url to Module def.
        launchUrl: `https://${module.name}.dxos.org`
      })),
    [modules]
  );

  return (
    <>
      <Heading className='mlb-4'>{t('apps label')}</Heading>
      {isLoading ? <Loading label={t('generic loading label')} size='md' /> : <AppList apps={apps} />}
    </>
  );
};

export default AppsPage;
