//
// Copyright 2025 DXOS.org
//

import { pipe, Schema } from 'effect';
import React, { useCallback, useMemo } from 'react';

import { LayoutAction, chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { SpaceAction } from '@dxos/plugin-space/types';
import { live, makeRef, type Space } from '@dxos/react-client/echo';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { DataType } from '@dxos/schema';

import { INTEGRATION_PLUGIN } from '../meta';
import { IntegrationAction, type IntegrationDefinition, IntegrationType } from '../types';

export const ADD_TOKEN_DIALOG = `${INTEGRATION_PLUGIN}/AddTokenDialog`;

const FormSchema = DataType.AccessToken.pipe(Schema.omit('id'));
type TokenForm = Schema.Schema.Type<typeof FormSchema>;

export type AddTokenDialogProps = {
  space: Space;
  definition: IntegrationDefinition;
};

export const AddTokenDialog = ({ space, definition }: AddTokenDialogProps) => {
  const { t } = useTranslation(INTEGRATION_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleAdd = useCallback(
    async (form: TokenForm) => {
      const token = live(DataType.AccessToken, form);
      const integration = live(IntegrationType, {
        serviceId: definition.serviceId,
        accessToken: makeRef(token),
      });
      void dispatch(
        pipe(
          createIntent(SpaceAction.AddObject, { object: integration, target: space, hidden: true }),
          chain(IntegrationAction.IntegrationCreated),
          chain(LayoutAction.UpdateDialog, { part: 'dialog', options: { state: false } }),
        ),
      );
    },
    [dispatch, space, definition],
  );

  const handleCancel = useCallback(
    () => dispatch(createIntent(LayoutAction.UpdateDialog, { part: 'dialog', options: { state: false } })),
    [dispatch],
  );

  const initialValues = useMemo(
    () => ({
      source: definition.auth?.source,
      note: definition.auth?.note,
      token: '',
    }),
    [definition],
  );

  return (
    <Dialog.Content>
      <Dialog.Title classNames='sr-only'>{t('add token label')}</Dialog.Title>
      <Dialog.Description classNames='sr-only'>{t('add token description')}</Dialog.Description>
      <Form classNames='p-0' schema={FormSchema} values={initialValues} onCancel={handleCancel} onSave={handleAdd} />
    </Dialog.Content>
  );
};
