//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Column, Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { useInputSurfaceLookup } from '#hooks';
import { meta } from '#meta';
import { SpaceOperation } from '#operations';
import { SpaceForm } from '#types';

export const CREATE_SPACE_DIALOG = `${meta.profile.key}.CreateSpaceDialog`;

type FormValues = Schema.Schema.Type<typeof SpaceForm>;
const initialValues: FormValues = { edgeReplication: true };

export const CreateSpaceDialog = () => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(meta.profile.key);
  const { invoke } = useOperationInvoker();

  const inputSurfaceLookup = useInputSurfaceLookup();
  const [error, setError] = useState<string | undefined>(undefined);

  const handleCreateSpace = useCallback(
    (data: FormValues) => {
      setError(undefined);
      return Effect.gen(function* () {
        const { space } = yield* invoke(SpaceOperation.Create, data);
        yield* invoke(LayoutOperation.Open, {
          subject: [Paths.getSpaceHomePath(space.id)],
          workspace: Paths.getSpacePath(space.id),
          navigation: 'immediate',
        });
        yield* invoke(LayoutOperation.UpdateDialog, { state: false });
      }).pipe(
        Effect.catchAll((failure) =>
          Effect.sync(() => {
            log.catch(failure);
            setError(t('create-space-dialog.error.message'));
          }),
        ),
        EffectEx.runAndForwardErrors,
      );
    },
    [invoke, t],
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
              <Form.Error>{error}</Form.Error>
              <Form.Submit />
            </Form.Content>
          </Column.Center>
        </Form.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};

CreateSpaceDialog.displayName = 'CreateSpaceDialog';
