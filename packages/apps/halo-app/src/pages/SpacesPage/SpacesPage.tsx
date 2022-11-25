//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { SpaceList } from '@dxos/react-appkit';
import { useSpaces } from '@dxos/react-client';
import { Heading, useTranslation } from '@dxos/react-uikit';

export const SpacesPage = () => {
  const spaces = useSpaces();
  const { t } = useTranslation('halo');

  return (
    <main className='max-is-5xl mli-auto pli-7'>
      <Heading className='mbe-6'>{t('spaces label')}</Heading>
      <SpaceList spaces={spaces} />
    </main>
  );
};
