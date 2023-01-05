//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { SpaceList } from '@dxos/react-appkit';
import { useSpaces } from '@dxos/react-client';
import { Heading, useTranslation } from '@dxos/react-ui';

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
