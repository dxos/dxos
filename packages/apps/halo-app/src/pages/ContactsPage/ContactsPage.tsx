//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Main, Heading, useTranslation } from '@dxos/react-uikit';

export const ContactsPage = () => {
  const { t } = useTranslation('halo');
  return (
    <Main className='max-w-7xl mx-auto'>
      <Heading>{t('contacts label')}</Heading>
    </Main>
  );
};
