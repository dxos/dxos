//
// Copyright 2022 DXOS.org
//

import { Plus } from 'phosphor-react';
import React, { useCallback, useState } from 'react';

import { CancellableInvitationObservable } from '@dxos/client';
import { HeadingWithActions, InvitationList } from '@dxos/react-appkit';
import { useClient, useDevices, useHaloInvitations, useIdentity } from '@dxos/react-client';
import { Heading } from '@dxos/react-ui';
import { Button, useTranslation, getSize } from '@dxos/react-uikit';

import { DeviceList } from '../../components';
import { createInvitationUrl } from '../../util';

export const DevicesPage = () => {
  const { t } = useTranslation('halo');
  const client = useClient();
  const identity = useIdentity();
  const devices = useDevices();
  const invitations = useHaloInvitations();
  const [creatingInvitation, setCreatingInvitation] = useState(false);

  const handleCreateInvitation = useCallback(() => {
    setCreatingInvitation(true);
    void client.halo.createInvitation().finally(() => setCreatingInvitation(false));
  }, []);

  const handleRemove = useCallback((id: string) => {
    void client.halo.removeInvitation(id);
  }, []);

  return (
    <main className='max-is-5xl mli-auto pli-7'>
      <HeadingWithActions
        className='mbe-6'
        heading={{ children: t('devices label') }}
        actions={
          <Button
            variant='primary'
            className='grow flex gap-1'
            onClick={handleCreateInvitation}
            disabled={creatingInvitation}
          >
            <Plus className={getSize(5)} />
            {t('add device label')}
          </Button>
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
    </main>
  );
};
