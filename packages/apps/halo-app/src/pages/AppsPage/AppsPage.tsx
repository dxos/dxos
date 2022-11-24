//
// Copyright 2022 DXOS.org
//

import React, { useMemo } from 'react';

import { useModules } from '@dxos/react-client';

import { AppList, AppProps } from '../../components';

export const AppsPage = () => {
  // TODO(burdon): Change tags to 'showcase' once apps re redeployed.
  const modules = useModules([], 1_000);
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
    <main className='max-is-5xl mli-auto pli-7'>
      <AppList apps={apps} />
    </main>
  );
};
