//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useRef } from 'react';

import { LayoutAction, createIntent } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { Dialog, IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { cardDialogContent, cardDialogHeader } from '@dxos/react-ui-stack';

import { useInputSurfaceLookup } from '../../hooks';
import { meta } from '../../meta';
import { SpaceAction, SpaceForm } from '../../types';

export const CREATE_SPACE_DIALOG = `${meta.id}/CreateSpaceDialog`;

type FormValues = Schema.Schema.Type<typeof SpaceForm>;
const initialValues: FormValues = { edgeReplication: true };

export const CreateSpaceDialog = () => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(meta.id);
  const { dispatch } = useIntentDispatcher();

  const inputSurfaceLookup = useInputSurfaceLookup();

  const handleCreateSpace = useCallback(
    async (data: FormValues) => {
      const program = Effect.gen(function* () {
        const { space } = yield* dispatch(createIntent(SpaceAction.Create, data));
        yield* dispatch(
          createIntent(LayoutAction.SwitchWorkspace, {
            part: 'workspace',
            subject: space.id,
          }),
        );
        yield* dispatch(
          createIntent(LayoutAction.UpdateDialog, {
            part: 'dialog',
            options: { state: false },
          }),
        );
      });
      await Effect.runPromise(program);
    },
    [dispatch],
  );

  return (
    // TODO(wittjosiah): The tablist dialog pattern is copied from @dxos/plugin-manager.
    //  Consider factoring it out to the tabs package.
    <Dialog.Content classNames={cardDialogContent}>
      <div role='none' className={cardDialogHeader}>
        <Dialog.Title>{t('create space dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <IconButton
            ref={closeRef}
            icon='ph--x--regular'
            size={4}
            label='Close'
            iconOnly
            density='fine'
            variant='ghost'
            autoFocus
          />
        </Dialog.Close>
      </div>
      <div role='none' className='contents'>
        <Form
          testId='create-space-form'
          autoFocus
          values={initialValues}
          schema={SpaceForm}
          lookupComponent={inputSurfaceLookup}
          onSave={handleCreateSpace}
          outerSpacing='scroll-fields'
        />
      </div>
    </Dialog.Content>
  );
};
