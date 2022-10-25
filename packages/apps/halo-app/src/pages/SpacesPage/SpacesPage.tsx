//
// Copyright 2022 DXOS.org
//

import { Plus, Rocket } from 'phosphor-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useClient, useParties } from '@dxos/react-client';
import { JoinPartyDialog } from '@dxos/react-toolkit';
import {
  Button,
  getSize,
  Main,
  useTranslation,
  Heading
} from '@dxos/react-uikit';

import { SpaceList } from '../../components';

export const SpacesPage = () => {
  const client = useClient();
  const spaces = useParties();
  const navigate = useNavigate();
  const [showJoin, setShowJoin] = useState(false);
  const { t } = useTranslation('halo');

  return (
    <Main>
      <div role='none' className='flex gap-2 items-center'>
        <Heading>{t('spaces label')}</Heading>
        <div role='none' className='flex-grow' />
        <Button onClick={() => setShowJoin(true)} className='flex gap-1'>
          <Rocket className={getSize(5)} />
          {t('join space label', { ns: 'uikit' })}
        </Button>
        <Button
          variant='primary'
          onClick={() => client.echo.createParty()}
          className='flex gap-1'
        >
          <Plus className={getSize(5)} />
          {t('create space label', { ns: 'uikit' })}
        </Button>
      </div>

      {spaces?.length > 0 && <SpaceList spaces={spaces} />}

      <JoinPartyDialog
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoin={(space) => navigate(`/spaces/${space.key.toHex()}`)}
      />
    </Main>
  );
};
