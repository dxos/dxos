//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { EffectEx } from '@dxos/effect';
import { Column, Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { useInputSurfaceLookup } from '#hooks';
import { meta } from '#meta';
import { SpaceOperation } from '#operations';
import { SpaceForm } from '#types';

export const CREATE_SPACE_DIALOG = `${meta.id}.CreateSpaceDialog`;

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
            invokePromise(LayoutOperation.Open, {
              subject: [Paths.getSpaceHomePath(result.space.id)],
              workspace: Paths.getSpacePath(result.space.id),
              navigation: 'immediate',
            }),
          );
          yield* Effect.promise(() => invokePromise(LayoutOperation.UpdateDialog, { state: false }));
        }
      });
      await EffectEx.runAndForwardErrors(program);
    },
    [invokePromise],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('create-space-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' ref={closeRef} />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <Form.Root
          testId='create-space-form'
          autoFocus
          schema={SpaceForm}
          defaultValues={initialValues}
          fieldProvider={inputSurfaceLookup}
          onSave={handleCreateSpace}
        >
          {/* Dialog.Body owns the gutter Column; place the form in its center column via Column.Center
              (not Form.Viewport's own Column.Root, which double-insets) so it aligns with the title. */}
          <Column.Center>
            <Form.Content>
              <Form.FieldSet />
              <Form.Submit />
            </Form.Content>
          </Column.Center>
        </Form.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};
