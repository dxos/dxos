//
// Copyright 2022 DXOS.org
//

import { Plus, Rocket } from 'phosphor-react';
import React from 'react';

import { useClient, useParties } from '@dxos/react-client';
import { DOCUMENT_TYPE } from '@dxos/react-composer';
import { Button, getSize, useTranslation } from '@dxos/react-uikit';
import { TextModel } from '@dxos/text-model';

import { JoinSpaceDialog } from '..';
import { SpaceList, HeadingWithActions } from '../../components';

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
      <HeadingWithActions
        className='mbe-6'
        heading={{
          children: t('spaces label')
        }}
        actions={
          <>
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
          </>
        }
      />

      {spaces?.length > 0 && <SpaceList spaces={spaces} />}
    </main>
  );
};
