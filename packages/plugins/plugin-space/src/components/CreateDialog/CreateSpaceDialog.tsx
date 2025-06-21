//
// Copyright 2024 DXOS.org
//

import { Effect, type Schema } from 'effect';
import React, { useCallback, useRef } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { useInputSurfaceLookup } from '../../hooks';
import { SPACE_PLUGIN } from '../../meta';
import { SpaceAction, SpaceForm } from '../../types';

export const CREATE_SPACE_DIALOG = `${SPACE_PLUGIN}/CreateSpaceDialog`;

type FormValues = Schema.Schema.Type<typeof SpaceForm>;
const initialValues: FormValues = { edgeReplication: true };

export const CreateSpaceDialog = () => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(SPACE_PLUGIN);
  const { dispatch } = useIntentDispatcher();

  const inputSurfaceLookup = useInputSurfaceLookup();

  const handleCreateSpace = useCallback(
    async (data: FormValues) => {
      const program = Effect.gen(function* () {
        const { space } = yield* dispatch(createIntent(SpaceAction.Create, data));
        yield* dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: space.id }));
        yield* dispatch(createIntent(SpaceAction.OpenCreateObject, { target: space }));
      });
      await Effect.runPromise(program);
    },
    [dispatch],
  );

  return (
    // TODO(wittjosiah): The tablist dialog pattern is copied from @dxos/plugin-manager.
    //  Consider factoring it out to the tabs package.
    <Dialog.Content classNames='p-0 bs-content min-bs-[16rem] max-bs-full md:max-is-[32rem] overflow-hidden'>
      <div role='none' className='flex justify-between pbs-2 pis-2 pie-2 @md:pbs-4 @md:pis-4 @md:pie-4'>
        <Dialog.Title>{t('create space dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Button ref={closeRef} density='fine' variant='ghost' autoFocus>
            <Icon icon='ph--x--regular' size={4} />
          </Button>
        </Dialog.Close>
      </div>
      <div className='p-4'>
        <Form
          testId='create-space-form'
          flush
          autoFocus
          values={initialValues}
          schema={SpaceForm}
          lookupComponent={inputSurfaceLookup}
          onSave={handleCreateSpace}
        />
      </div>
    </Dialog.Content>
  );
};
