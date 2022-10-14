//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Heading, Loading } from '@dxos/react-ui';

export const ProviderFallback = ({ message }: { message: string }) => (
  <div className='py-8 flex flex-col gap-4' aria-live='polite'>
    <Loading size='lg' />
    <Heading level={1} className='text-lg font-light text-center'>
      {message}
    </Heading>
  </div>
);
