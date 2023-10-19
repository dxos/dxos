//
// Copyright 2022 DXOS.org
//

import { UserPlus } from '@phosphor-icons/react';
import React, { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import urlJoin from 'url-join';

import { Button, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';
import { useMembers, useSpace, useSpaceInvitations } from '@dxos/react-client/echo';
import type { Identity } from '@dxos/react-client/halo';

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
  spacesPath = '/',
}: ManageSpacePageProps) => {
  const { t } = useTranslation('appkit');
  const navigate = useNavigate();
  const { spaceKey: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex, () => navigate(spacesPath));
  const space = useSpace(spaceKey);
  const members = useMembers(spaceKey);
  const memberProfiles = useMemo(
    () => members.map(({ identity }) => identity).filter((identity): identity is Identity => !!identity),
    [members],
  );
  const invitations = useSpaceInvitations(space?.key);

  const handleCreateInvitation = useCallback(() => {
    space?.share();
  }, [space]);

  return (
    <>
      <HeadingWithActions
        heading={{
          level: 2,
          children: t('space members label', { ns: 'appkit' }),
        }}
        actions={
          <>
            <Button
              variant='primary'
              onClick={handleCreateInvitation}
              classNames='flex gap-1 items-center'
              disabled={!space}
            >
              <span>{t('create invitation label')}</span>
              <UserPlus className={getSize(5)} />
            </Button>
          </>
        }
      />
      <ProfileList identities={memberProfiles} />
      <InvitationList
        invitations={invitations}
        createInvitationUrl={createInvitationUrl}
        onClickRemove={(invitation) => invitation.cancel()}
      />
    </>
  );
};
