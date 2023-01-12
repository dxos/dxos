//
// Copyright 2022 DXOS.org
//

import { UserPlus } from 'phosphor-react';
import React, { useCallback, useMemo } from 'react';

import type { Profile } from '@dxos/client';
import { HeadingWithActions, InvitationList, ProfileList } from '@dxos/react-appkit';
import { useMembers, useSpaceInvitations } from '@dxos/react-client';
import { Button, getSize, useTranslation } from '@dxos/react-components';

import { useSpace } from '../../hooks';
import { createInvitationUrl } from '../../util';

// NOTE: Copied from react-appkit.
// TODO(wittjosiah): Utilize @dxos/react-ui patterns.

export const ManageSpacePage = () => {
  const { t } = useTranslation('appkit');
  const { space } = useSpace();
  const members = useMembers(space.key);
  const memberProfiles = useMemo(
    () => members.map(({ profile }) => profile).filter((profile): profile is Profile => !!profile),
    [members]
  );
  const invitations = useSpaceInvitations(space?.key);

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
            >
              <span>{t('create invitation label')}</span>
              <UserPlus className={getSize(5)} />
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
