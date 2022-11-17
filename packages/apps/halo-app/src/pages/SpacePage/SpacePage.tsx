//
// Copyright 2022 DXOS.org
//

import { CaretLeft, Planet } from 'phosphor-react';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSafeSpaceKey } from '@dxos/react-appkit';
import { useMembers, useSpace } from '@dxos/react-client';
import { Button, getSize, Heading, useTranslation, Tooltip } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

import { ProfileList } from '@dxos/react-appkit/src/components/ProfileList';

export const SpacePage = () => {
  const { t } = useTranslation('halo');
  const navigate = useNavigate();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex, () => navigate('/'));
  const space = useSpace(spaceKey);
  const members = useMembers(spaceKey);

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
        <Heading level={2}>{t('space members label', { ns: 'uikit' })}</Heading>
        <ProfileList profiles={members} />
      </main>
    </>
  );
};
