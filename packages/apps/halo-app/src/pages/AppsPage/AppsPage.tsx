//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { HeadingWithActions } from '@dxos/react-appkit';
import { useMetagraph } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-uikit';

import { AppList, AppProps } from '../../components';

export const AppsPage = () => {
  const { t } = useTranslation('halo');

  // TODO(burdon): Factor out separate hook?
  const metagraph = useMetagraph();
  const [apps, setApps] = useState<AppProps[]>([]);
  useEffect(() => {
    if (!metagraph) {
      return;
    }

    let unsubscribe: () => void | undefined;
    setTimeout(async () => {
      // TODO(burdon): Change tags to 'showcase' once apps re redeployed.
      const tags: string[] = [];
      const observable = await metagraph.modules.query({ tags });
      unsubscribe = observable.subscribe({
        onUpdate: (modules) => {
          setApps(
            modules.map((module) => ({
              module,
              launchUrl: `https://${module.name}.dxos.org` // TODO(burdon): Compute URL or get from dx.yml (hack).
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
      <HeadingWithActions heading={{ children: t('apps label') }} />
      <AppList apps={apps} />
    </main>
  );
};
