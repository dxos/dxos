//
// Copyright 2022 DXOS.org
//

import { Plus, Rocket } from 'phosphor-react';
import React from 'react';

import { DOCUMENT_TYPE } from '@dxos/composer';
import { useClient, useParties } from '@dxos/react-client';
import { Button, Heading, getSize, useTranslation } from '@dxos/react-uikit';
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
    <main className='max-is-5xl mli-auto pli-7'>
      <Heading className='mbe-6'>{t('spaces label')}</Heading>
      {spaces?.length > 0 && <SpaceList spaces={spaces} />}
      <div role='none' className='flex flex-wrap gap-x-4 gap-y-2 mbs-4'>
        <JoinSpaceDialog
          openTrigger={
            <Button className='grow flex gap-1'>
              <Rocket className={getSize(5)} />
              {t('join space label', { ns: 'uikit' })}
            </Button>
          }
        />
        <Button variant='primary' onClick={handleCreateSpace} className='grow flex gap-1'>
          <Plus className={getSize(5)} />
          {t('create space label', { ns: 'uikit' })}
        </Button>
      </div>
    </main>
  );
};
