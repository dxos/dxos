//
// Copyright 2022 DXOS.org
//

import { CaretLeft, Planet, UserPlus } from 'phosphor-react';
import React, { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useMembers, useParty, usePartyInvitations } from '@dxos/react-client';
import { Button, getSize, Heading, useTranslation, Tooltip } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

import { InvitationList, HeadingWithActions } from '../../components';
import { ProfileList } from '../../components/ProfileList';
import { useSafeSpaceKey } from '../../hooks';

export const SpaceSettingsPage = () => {
  const { t } = useTranslation('halo');
  const navigate = useNavigate();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex);
  const space = useParty(spaceKey);
  const invitations = usePartyInvitations(spaceKey);
  const members = useMembers(space);

  const onCreateInvitation = useCallback(() => {
    if (space) {
      void space.createInvitation();
    }
  }, [space]);

  if (!space) {
    return null;
  }

  return (
    <>
      <div role='none' className='fixed block-start-6 inset-inline-24 flex gap-2 justify-center items-center z-[1]'>
        <Heading className='truncate pbe-1'>{humanize(space.key)}</Heading>
      </div>
      <div role='none' className='fixed block-start-7 inline-start-7 mlb-px'>
        <Tooltip content={t('back to spaces label')} side='right' tooltipLabelsTrigger>
          <Button compact onClick={() => navigate('/spaces')} className='flex gap-1'>
            <CaretLeft className={getSize(4)} />
            <Planet className={getSize(4)} />
          </Button>
        </Tooltip>
      </div>
      <main className='max-is-5xl mli-auto pli-7'>
        <HeadingWithActions
          heading={{
            level: 2,
            children: t('space members label', { ns: 'uikit' })
          }}
          actions={
            <>
              <Button variant='primary' onClick={onCreateInvitation} className='flex gap-1 items-center'>
                <span>{t('create invitation label')}</span>
                <UserPlus className={getSize(5)} />
              </Button>
            </>
          }
        />
        <ProfileList profiles={members} />
        <InvitationList {...{ invitations }} />
      </main>
    </>
  );
};
