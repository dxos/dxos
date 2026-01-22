//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useRef } from 'react';

import { Common } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/react';
import { runAndForwardErrors } from '@dxos/effect';
import { Dialog, IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { cardDialogContent, cardDialogHeader } from '@dxos/react-ui-mosaic';

import { useInputSurfaceLookup } from '../../hooks';
import { meta } from '../../meta';
import { SpaceForm, SpaceOperation } from '../../types';

export const CREATE_SPACE_DIALOG = `${meta.id}/CreateSpaceDialog`;

type FormValues = Schema.Schema.Type<typeof SpaceForm>;
const initialValues: FormValues = { edgeReplication: true };

export const CreateSpaceDialog = () => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const inputSurfaceLookup = useInputSurfaceLookup();

  const handleCreateSpace = useCallback(
    async (data: FormValues) => {
      const program = Effect.gen(function* () {
        const { data: result } = yield* Effect.promise(() => invokePromise(SpaceOperation.Create, data));
        if (result?.space) {
          yield* Effect.promise(() =>
            invokePromise(Common.LayoutOperation.SwitchWorkspace, { subject: result.space.id }),
          );
          yield* Effect.promise(() => invokePromise(Common.LayoutOperation.UpdateDialog, { state: false }));
        }
      });
      await runAndForwardErrors(program);
    },
    [invokePromise],
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
      <Form.Root
        testId='create-space-form'
        autoFocus
        schema={SpaceForm}
        values={initialValues}
        fieldProvider={inputSurfaceLookup}
        onSave={handleCreateSpace}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
            <Form.Submit />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Dialog.Content>
  );
};
