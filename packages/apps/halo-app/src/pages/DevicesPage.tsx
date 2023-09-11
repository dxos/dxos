//
// Copyright 2022 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { Heading, DeviceList, HeadingWithActions, InvitationList } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';
import { useDevices, useHaloInvitations } from '@dxos/react-client/halo';
import { CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { createInvitationUrl } from '../util';

const DevicesPage = () => {
  const { t } = useTranslation('halo');
  const client = useClient();
  const devices = useDevices();
  const invitations = useHaloInvitations();

  const handleCreateInvitation = useCallback(() => {
    client.halo.share();
  }, []);

  return (
    <>
      <HeadingWithActions
        className='mlb-4'
        heading={{ children: t('devices label') }}
        actions={
          <Button variant='primary' classNames='grow flex gap-1' onClick={handleCreateInvitation}>
            <Plus className={getSize(5)} />
            {t('add device label')}
          </Button>
        }
      />
      <DeviceList devices={devices} />
      <Heading level={2} className='text-xl mbs-4'>
        {t('device invitations label')}
      </Heading>
      <InvitationList
        invitations={invitations as unknown as CancellableInvitationObservable[] | undefined}
        createInvitationUrl={(invitationCode) => createInvitationUrl('/identity/join', invitationCode)}
        onClickRemove={(invitation) => invitation.cancel()}
      />
    </>
  );
};

export default DevicesPage;
