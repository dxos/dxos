//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Heading, Loading, useTranslation } from '@dxos/react-ui';

export const Fallback = ({ message }: { message: string }) => (
  <div className='py-8 flex flex-col gap-4' aria-live='polite'>
    <Loading label={message} size='lg' />
    <Heading level={1} className='text-lg font-light text-center'>
      {message}
    </Heading>
  </div>
);

export const GenericFallback = () => {
  const { t } = useTranslation('appkit');
  return <Fallback message={t('generic loading label')} />;
};
