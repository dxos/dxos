//
// Copyright 2022 DXOS.org
//

import { UserPlus, XCircle } from 'phosphor-react';
import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Profile } from '@dxos/client';
import { HeadingWithActions, InvitationList, ProfileList } from '@dxos/react-appkit';
import { useMembers, useSpaceInvitations } from '@dxos/react-client';
import { Button, getSize, useTranslation } from '@dxos/react-components';

import { createSpacePath, defaultFrameId, useSpace } from '../hooks';
import { createInvitationUrl } from '../util';

// NOTE: Copied from react-appkit.
// TODO(wittjosiah): Utilize @dxos/react-ui patterns.

const ManageSpacePage = () => {
  const { t } = useTranslation('kai');
  const navigate = useNavigate();
  const space = useSpace();
  const invitations = useSpaceInvitations(space?.key);
  const members = useMembers(space.key);
  const memberProfiles = useMemo(
    () => members.map(({ profile }) => profile).filter((profile): profile is Profile => !!profile),
    [members]
  );

  const handleCreateInvitation = useCallback(() => {
    if (space) {
      space.createInvitation();
    }
  }, [space]);

  const handleRemove = useCallback((id: string) => space?.removeInvitation(id), [space]);

  return (
    <div className='my-8 mx-auto p-2 w-screen md:w-2/3 lg:w-1/2'>
      <HeadingWithActions
        heading={{
          level: 2,
          children: t('space members label', { ns: 'appkit' })
        }}
        actions={
          <>
            <Button
              variant='primary'
              onClick={handleCreateInvitation}
              className='flex gap-1 items-center'
              disabled={!space}
              data-testid='create-invitation-button'
            >
              <span>{t('create invitation label', { ns: 'appkit' })}</span>
              <UserPlus className={getSize(5)} />
            </Button>
            <Button
              variant='primary'
              onClick={() => navigate(createSpacePath(space.key, defaultFrameId))}
              className='flex gap-1 items-center'
            >
              <span>{t('back to space label')}</span>
              <XCircle className={getSize(5)} />
            </Button>
          </>
        }
      />
      <ProfileList profiles={memberProfiles} />
      <InvitationList
        invitations={invitations}
        createInvitationUrl={(invitationCode) => createInvitationUrl('/space/join', invitationCode)}
        onClickRemove={handleRemove}
      />
    </div>
  );
};

export default ManageSpacePage;
