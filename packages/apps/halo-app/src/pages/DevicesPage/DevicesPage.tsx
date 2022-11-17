//
// Copyright 2022 DXOS.org
//

import { Plus } from 'phosphor-react';
import React, { useCallback, useState } from 'react';

import { InvitationObservable } from '@dxos/client';
import { HeadingWithActions, InvitationList } from '@dxos/react-appkit';
import { useClient, useDevices, useHaloInvitations } from '@dxos/react-client';
import { Button, useTranslation, getSize } from '@dxos/react-uikit';

import { DeviceList } from '../../components';
import { createInvitationUrl } from '../../util';

export const DevicesPage = () => {
  const { t } = useTranslation('halo');
  const client = useClient();
  const devices = useDevices();
  const invitations = useHaloInvitations();
  const [creatingInvitation, setCreatingInvitation] = useState(false);

  const onCreateInvitation = useCallback(() => {
    setCreatingInvitation(true);
    void client.halo.createInvitation().finally(() => setCreatingInvitation(false));
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
            onClick={onCreateInvitation}
            disabled={creatingInvitation}
          >
            <Plus className={getSize(5)} />
            {t('add device label')}
          </Button>
        }
      />
      <DeviceList devices={devices} />
      <InvitationList
        invitations={invitations as unknown as InvitationObservable[] | undefined}
        createInvitationUrl={(invitationCode) => createInvitationUrl('/identity/join', invitationCode)}
      />
    </main>
  );
};
