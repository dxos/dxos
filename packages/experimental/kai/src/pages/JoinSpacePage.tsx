//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Invitation } from '@dxos/client';
import { JoinPanel } from '@dxos/react-appkit';
import { InvitationResult, useClient } from '@dxos/react-client';
import { Group, useTranslation } from '@dxos/react-components';

import { invitationCodeFromUrl } from '../util';

/**
 * Join space via invitation URL.
 */
const JoinSpacePage = () => {
  const { t } = useTranslation('appkit');
  const client = useClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationParam = searchParams.get('invitation');

  const acceptInvitation = (invitation: Invitation) => client.echo.acceptInvitation(invitation);
  const handleJoin = ({ spaceKey }: InvitationResult) => navigate(`/${spaceKey!.truncate()}`);

  return (
    <div className='flex overflow-hidden w-full h-full'>
      <div className='flex flex-1 items-center'>
        <div className='my-8 mx-auto p-2 w-screen md:w-2/3 lg:w-1/2'>
          <Group label={{ children: t('join space label') }}>
            <JoinPanel
              initialInvitationCode={invitationParam ?? undefined}
              parseInvitation={(invitation) => invitationCodeFromUrl(invitation)}
              acceptInvitation={acceptInvitation}
              onJoin={handleJoin}
            />
          </Group>
        </div>
      </div>
    </div>
  );
};

export default JoinSpacePage;
