//
// Copyright 2022 DXOS.org
//

import { Plus, Rocket } from 'phosphor-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DOCUMENT_TYPE } from '@dxos/composer';
import { useClient, useParties } from '@dxos/react-client';
import { JoinPartyDialog } from '@dxos/react-toolkit';
import {
  Button,
  getSize,
  Main,
  useTranslation,
  Heading
} from '@dxos/react-uikit';
import { TextModel } from '@dxos/text-model';

import { SpaceList } from '../../components';

export const SpacesPage = () => {
  const client = useClient();
  const spaces = useParties();
  const navigate = useNavigate();
  const [showJoin, setShowJoin] = useState(false);
  const { t } = useTranslation('halo');

  const handleCreateSpace = async () => {
    const space = await client.echo.createParty();
    await space.database.createItem({
      model: TextModel,
      type: DOCUMENT_TYPE
    });
  };

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
          onClick={handleCreateSpace}
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
