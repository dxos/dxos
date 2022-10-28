//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Main, Heading, useTranslation } from '@dxos/react-uikit';

export const ContactsPage = () => {
  const { t } = useTranslation('halo');
  return (
    <Main>
      <Heading>{t('contacts label')}</Heading>
    </Main>
  );
};
