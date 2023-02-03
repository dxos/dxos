//
// Copyright 2022 DXOS.org
//

import React, { useState, useCallback } from 'react';

import { Trigger } from '@dxos/async';
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

/**
 * Fallback component for the ClientProvider from @dxos/react-client.
 * Allows the user to resume their client when it has been suspended.
 */
export const ClientFallback = ({ client, status }: Partial<ClientContextProps>) => {
  const { t } = useTranslation('appkit');
  const [pending, setPending] = useState(true);

  console.log(':::::::::::::::::::');

  // Set timeout to prevent flickering.
  const resume = useCallback(async () => {
    setPending(true);
    const done = new Trigger();
    setTimeout(() => done.wake(), 1000);
    await client?.resumeHostServices();
    await done.wait();
    setPending(false);
  }, [client]);

  switch (status) {
    case Status.INACTIVE:
      return (
        <div className='flex flex-col gap-4 justify-center items-center h-screen' aria-live='polite'>
          <Heading level={1} className='text-lg font-light text-center'>
            {t('resume heading label')}
          </Heading>
          {/* TODO(wittjosiah): Add "Why?" link out to documentation. */}
          <Heading level={3} className='text-sm font-light text-center'>
            {t('resume description label')}
          </Heading>
          <Button disabled={pending} onClick={resume}>
            {t('resume label')}
          </Button>
        </div>
      );

    default:
      return <GenericFallback />;
  }
};
