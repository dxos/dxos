//
// Copyright 2022 DXOS.org
//

import React, { useState, useCallback } from 'react';

import { Status } from '@dxos/client';
import { ClientContextProps } from '@dxos/react-client';
import { Button, Heading, Loading, useTranslation } from '@dxos/react-components';

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
  return <Fallback message={t('generic loading label', { ns: 'appkit' })} />;
};

export const ClientFallback = ({ client, status }: Partial<ClientContextProps>) => {
  const { t } = useTranslation('appkit');
  const [pending, setPending] = useState(false);

  const reconnect = useCallback(async () => {
    setPending(true);
    await client?.compatibilityModeReconnect();
    setPending(false);
  }, [client]);

  switch (status) {
    case Status.CLOSED:
      return (
        <div className='flex flex-col gap-4 justify-center items-center h-screen' aria-live='polite'>
          <Heading level={1} className='text-lg font-light text-center'>
            {t('reconnect heading label')}
          </Heading>
          {/* TODO(wittjosiah): Add "Why?" link out to documentation. */}
          <Heading level={3} className='text-sm font-light text-center'>
            {t('reconnect description label')}
          </Heading>
          <Button disabled={pending} onClick={reconnect}>
            {t('reconnect label')}
          </Button>
        </div>
      );

    default:
      return <GenericFallback />;
  }
};
