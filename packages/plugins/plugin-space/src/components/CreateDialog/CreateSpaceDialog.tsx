//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { type S } from '@dxos/echo-schema';
import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { SPACE_PLUGIN, SpaceAction } from '../../meta';
import { SpaceForm } from '../../types';

type FormValues = S.Schema.Type<typeof SpaceForm>;
const initialValues: FormValues = { edgeReplication: true };

export const CreateSpaceDialog = () => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(SPACE_PLUGIN);
  const dispatch = useIntentDispatcher();

  const handleCreateSpace = useCallback(
    async (data: FormValues) => {
      const result = await dispatch({
        action: SpaceAction.CREATE,
        data,
      });
      const target = result?.data.space;
      if (target) {
        await dispatch({
          action: SpaceAction.OPEN_CREATE_OBJECT,
          data: { target },
        });
      }
    },
    [dispatch],
  );

  return (
    // TODO(wittjosiah): The tablist dialog pattern is copied from @dxos/plugin-manager.
    //  Consider factoring it out to the tabs package.
    <Dialog.Content classNames='p-0 bs-content min-bs-[15rem] max-bs-full md:max-is-[40rem] overflow-hidden'>
      <div role='none' className='flex justify-between pbs-3 pis-2 pie-3 @md:pbs-4 @md:pis-4 @md:pie-5'>
        <Dialog.Title>{t('create space dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Button ref={closeRef} density='fine' variant='ghost' autoFocus>
            <Icon icon='ph--x--regular' size={4} />
          </Button>
        </Dialog.Close>
      </div>
      <div className='p-4'>
        <Form values={initialValues} schema={SpaceForm} onSave={handleCreateSpace} />
      </div>
    </Dialog.Content>
  );
};
