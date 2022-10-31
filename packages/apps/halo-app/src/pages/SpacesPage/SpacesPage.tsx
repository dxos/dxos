//
// Copyright 2022 DXOS.org
//

import { Plus, Rocket } from 'phosphor-react';
import React from 'react';

import { DOCUMENT_TYPE } from '@dxos/composer';
import { useClient, useParties } from '@dxos/react-client';
import { Button, getSize, Main, useTranslation, Heading } from '@dxos/react-uikit';
import { TextModel } from '@dxos/text-model';

import { JoinSpaceDialog } from '..';
import { SpaceList } from '../../components';

export const SpacesPage = () => {
  const client = useClient();
  const spaces = useParties();
  const { t } = useTranslation('halo');

  const handleCreateSpace = async () => {
    const space = await client.echo.createParty();
    await space.database.createItem({
      model: TextModel,
      type: DOCUMENT_TYPE
    });
  };

  return (
    <Main className='max-w-7xl mx-auto'>
      <div role='none' className='flex gap-2 items-center'>
        <Heading>{t('spaces label')}</Heading>
        <div role='none' className='flex-grow' />
        <JoinSpaceDialog
          openTrigger={
            <Button className='flex gap-1'>
              <Rocket className={getSize(5)} />
              {t('join space label', { ns: 'uikit' })}
            </Button>
          }
        />
        <Button variant='primary' onClick={handleCreateSpace} className='flex gap-1'>
          <Plus className={getSize(5)} />
          {t('create space label', { ns: 'uikit' })}
        </Button>
      </div>

      {spaces?.length > 0 && <SpaceList spaces={spaces} />}
    </Main>
  );
};
