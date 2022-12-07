//
// Copyright 2022 DXOS.org
//

import { UserPlus } from 'phosphor-react';
import React, { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import urlJoin from 'url-join';

import type { Profile } from '@dxos/client';
import { useMembers, useSpace, useSpaceInvitations } from '@dxos/react-client';
import { Button, getSize, useTranslation } from '@dxos/react-uikit';

import { useSafeSpaceKey } from '../../hooks';
import { HeadingWithActions } from '../HeadingWithActions';
import { InvitationList } from '../InvitationList';
import { ProfileList } from '../ProfileList';

const defaultCreateInvitationUrl = (invitationCode: string) => {
  const { origin, pathname } = window.location;
  return urlJoin(origin, pathname, `/#?invitation=${invitationCode}`);
};

export interface ManageSpacePageProps {
  spacesPath?: string;
  createInvitationUrl?: (invitationCode: string) => string;
}

export const ManageSpacePage = ({
  createInvitationUrl = defaultCreateInvitationUrl,
  spacesPath = '/'
}: ManageSpacePageProps) => {
  const { t } = useTranslation('appkit');
  const navigate = useNavigate();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex, () => navigate(spacesPath));
  const space = useSpace(spaceKey);
  const members = useMembers(spaceKey);
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
    <main className='max-is-5xl mli-auto pli-7'>
      <HeadingWithActions
        heading={{
          level: 2,
          children: t('space members label', { ns: 'uikit' })
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
        createInvitationUrl={createInvitationUrl}
        onClickRemove={handleRemove}
      />
    </main>
  );
};
