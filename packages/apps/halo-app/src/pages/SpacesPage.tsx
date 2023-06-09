//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { Heading, SpaceList } from '@dxos/react-appkit';
import { useSpaces } from '@dxos/react-client';

export const SpacesPage = () => {
  const spaces = useSpaces();
  const { t } = useTranslation('halo');

  return (
    <>
      <Heading className='mlb-4'>{t('spaces label')}</Heading>
      <SpaceList spaces={spaces} />
    </>
  );
};

export default SpacesPage;
