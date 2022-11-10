//
// Copyright 2022 DXOS.org
//

import { CaretLeft, Planet, UserPlus } from 'phosphor-react';
import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSafeSpaceKey } from '@dxos/react-appkit';
import { useMembers, useSpace } from '@dxos/react-client';
import { Button, getSize, Heading, useTranslation, Tooltip } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

import { InvitationList, HeadingWithActions } from '../../components';
import { ProfileList } from '../../components/ProfileList';

export const SpaceSettingsPage = () => {
  const { t } = useTranslation('halo');
  const navigate = useNavigate();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex, () => navigate('/'));
  const space = useSpace(spaceKey);
  const invitations = space?.invitations;
  const members = useMembers(spaceKey);
  const [creatingInvitation, setCreatingInvitation] = useState(false);

  const onCreateInvitation = useCallback(() => {
    if (space) {
      setCreatingInvitation(true);
      void space.createInvitation().finally(() => setCreatingInvitation(false));
    }
  }, [space]);

  return (
    <>
      <div role='none' className='fixed block-start-6 inset-inline-24 flex gap-2 justify-center items-center z-[1]'>
        <Heading className='truncate pbe-1'>{space ? humanize(space.key) : '…'}</Heading>
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
              <Button
                variant='primary'
                onClick={onCreateInvitation}
                className='flex gap-1 items-center'
                disabled={!space || creatingInvitation}
              >
                <span>{t('create invitation label')}</span>
                <UserPlus className={getSize(5)} />
              </Button>
            </>
          }
        />
        <ProfileList profiles={members} />
        <InvitationList invitations={invitations} />
      </main>
    </>
  );
};
