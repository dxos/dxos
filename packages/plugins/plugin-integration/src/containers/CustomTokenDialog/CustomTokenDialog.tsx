//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type Database } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { IntegrationCoordinator } from '../../capabilities/integration-coordinator';

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
 * Dialog for creating an Integration backed by a manually-entered access
 * token. Used by the "Custom Token" provider — no OAuth flow runs; the user
 * supplies `{ source, account?, token }` directly. On submit the dialog
 * delegates to `IntegrationCoordinator.createCustomIntegration`, which
 * persists the AccessToken + Integration, fires `AccessTokenCreated`, and
 * navigates to the new article — same finalization path as the OAuth flow.
 *
 * Layout mirrors `CreateObjectDialog`: a `Dialog.Content` with a header and
 * body whose body hosts a `Form.Root` → `Form.Viewport` → `Form.Content`
 * with `Form.FieldSet` + `Form.Submit`. The dialog is opened by the
 * coordinator with `blockAlign: 'start'` so it sits at the top of the
 * viewport like the create-object flow.
 */
export const CustomTokenDialog = ({ db, providerId, providerLabel }: CustomTokenDialogProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const coordinator = useCapability(IntegrationCoordinator);
  const [error, setError] = useState<string>();

  const handleSave = useCallback(
    (values: CustomTokenValues) => {
      void (async () => {
        setError(undefined);
        try {
          // Coordinator persists, fires AccessTokenCreated, and navigates to
          // the new Integration's article. Dialog only closes on success.
          await coordinator.createCustomIntegration({
            db,
            providerId,
            source: values.source,
            account: values.account,
            token: values.token,
            name: providerLabel,
          });
          await invokePromise(LayoutOperation.UpdateDialog, { state: false });
        } catch (err) {
          log.catch(err);
          setError(String((err as Error).message ?? err));
        }
      })();
    },
    [coordinator, db, providerId, providerLabel, invokePromise],
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
