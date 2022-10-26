//
// Copyright 2022 DXOS.org
//

import { Eraser } from 'phosphor-react';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import urlJoin from 'url-join';

import type { Profile as NaturalProfile } from '@dxos/client';
import { useClient, useHaloInvitations } from '@dxos/react-client';
import { Button, getSize, Input, Loading, QrCode } from '@dxos/react-ui';
import { humanize } from '@dxos/util';

export interface ProfileProps {
  profile: NaturalProfile;
  createInvitationUrl?: (invitationCode: string) => string;
}

// TODO(wittjosiah): Remove.
const defaultCreateUrl = (invitationCode: string) => {
  const invitationPath = '/profile/invite-device'; // App-specific.
  const { origin, pathname } = window.location;
  return urlJoin(
    origin,
    pathname,
    `/#${invitationPath}`,
    `?invitation=${invitationCode}`
  );
};

export const Profile = ({
  profile,
  createInvitationUrl = defaultCreateUrl
}: ProfileProps) => {
  const { t } = useTranslation();
  const client = useClient();
  const invitations = useHaloInvitations(client);

  useEffect(() => {
    if (invitations.length < 1) {
      void client.halo.createInvitation();
    }
  }, [client, invitations]);

  // TODO(wittjosiah): This should re-generate once it is used.
  const invitationUrl = useMemo(
    () =>
      invitations[0] &&
      createInvitationUrl(invitations[0].descriptor.encode().toString()),
    [invitations]
  );

  return (
    <div role='none' className='flex flex-col gap-4 items-center'>
      <Input
        label={t('username label')}
        initialValue={profile.username}
        placeholder={humanize(profile.publicKey.toHex())}
        className='my-0'
      />
      {invitationUrl ? (
        <QrCode
          size={40}
          value={invitationUrl}
          label={t('copy invite code label', { ns: 'halo' })}
          side='left'
          className='w-full h-auto'
        />
      ) : (
        <Loading label={t('generic loading label')} size='md' />
      )}
      <Button variant='outline' className='w-full flex gap-2'>
        <Eraser className={getSize(5)} />
        {t('reset device label', { ns: 'halo' })}
      </Button>
    </div>
  );
};
