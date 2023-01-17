//
// Copyright 2022 DXOS.org
//

import { Plus, XCircle } from 'phosphor-react';
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { CancellableInvitationObservable } from '@dxos/client';
import { DeviceList, HeadingWithActions, InvitationList } from '@dxos/react-appkit';
import { useClient, useDevices, useHaloInvitations, useIdentity } from '@dxos/react-client';
import { Heading, Button, useTranslation, getSize } from '@dxos/react-components';

import { createInvitationUrl } from '../util';

// NOTE: Copied from halo-app.
// TODO(wittjosiah): Utilize @dxos/react-ui patterns.

export const IdentityPage = () => {
  const { t } = useTranslation('kai');
  const navigate = useNavigate();
  const client = useClient();
  const identity = useIdentity();
  const devices = useDevices();
  const invitations = useHaloInvitations();

  const handleCreateInvitation = useCallback(() => {
    client.halo.createInvitation();
  }, []);

  const handleRemove = useCallback((id: string) => {
    void client.halo.removeInvitation(id);
  }, []);

  return (
    <div className='my-8 mx-auto p-2 w-screen md:w-2/3 lg:w-1/2'>
      <HeadingWithActions
        className='mlb-4'
        heading={{ children: t('devices label') }}
        actions={
          <>
            <Button variant='primary' className='grow flex gap-1' onClick={handleCreateInvitation}>
              <Plus className={getSize(5)} />
              {t('add device label')}
            </Button>
            <Button variant='primary' onClick={() => navigate('/')} className='flex gap-1 items-center'>
              <span>{t('back to app label')}</span>
              <XCircle className={getSize(5)} />
            </Button>
          </>
        }
      />
      <DeviceList devices={devices} currentDevice={identity?.deviceKey} />
      <Heading level={2} className='text-xl mbs-4'>
        {t('device invitations label')}
      </Heading>
      <InvitationList
        invitations={invitations as unknown as CancellableInvitationObservable[] | undefined}
        createInvitationUrl={(invitationCode) => createInvitationUrl('/identity/join', invitationCode)}
        onClickRemove={handleRemove}
      />
    </div>
  );
};
