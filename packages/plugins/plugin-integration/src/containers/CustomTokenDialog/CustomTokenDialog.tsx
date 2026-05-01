//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type Database } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { IntegrationCoordinator } from '#types';

/**
 * Form schema for the custom-token entry dialog. Annotations drive the
 * Form's auto-rendered field labels and descriptions.
 */
const CustomTokenForm = Schema.Struct({
  source: Format.Hostname.annotations({
    title: 'Source',
    description: 'The domain name of the service that issued the token.',
    examples: ['example.com'],
  }),
  account: Schema.String.annotations({
    title: 'Account',
    description: 'Optional account label associated with the token.',
  }).pipe(Schema.optional),
  token: Schema.String.annotations({
    title: 'Token',
    description: 'The access token value.',
  }),
});

type CustomTokenValues = Schema.Schema.Type<typeof CustomTokenForm>;

export type CustomTokenDialogProps = {
  db: Database.Database;
  providerId: string;
  /** Optional pre-filled label used as the new Integration's `name`. */
  providerLabel?: string;
};

/**
 * Dialog for integrations created with a manually entered access token (no OAuth flow).
 */
export const CustomTokenDialog = ({ db, providerId, providerLabel }: CustomTokenDialogProps) => {
  const { t } = useTranslation(meta.id);
  const { invoke } = useOperationInvoker();
  const coordinator = useCapability(IntegrationCoordinator);
  const [error, setError] = useState<string>();

  const handleSave = useCallback(
    (values: CustomTokenValues) => {
      setError(undefined);
      void runAndForwardErrors(
        Effect.gen(function* () {
          yield* coordinator.createCustomIntegration({
            db,
            providerId,
            source: values.source,
            account: values.account,
            token: values.token,
            name: providerLabel,
          });
          yield* invoke(LayoutOperation.UpdateDialog, { state: false });
        }).pipe(
          Effect.catchAll((failure) =>
            Effect.sync(() => {
              log.catch(failure);
              setError(String(failure instanceof Error ? failure.message : failure));
            }),
          ),
        ),
      );
    },
    [coordinator, db, providerId, providerLabel, invoke],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('custom-token-dialog.title', { defaultValue: 'Add custom token' })}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <Form.Root autoFocus schema={CustomTokenForm} defaultValues={{ source: '', token: '' }} onSave={handleSave}>
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet />
              <Form.Submit />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
        {error && <p className='text-error'>{error}</p>}
      </Dialog.Body>
    </Dialog.Content>
  );
};
