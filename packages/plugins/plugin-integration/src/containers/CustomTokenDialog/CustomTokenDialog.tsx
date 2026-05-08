//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type Database, Obj, Ref } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { AccessToken } from '@dxos/types';

import { meta } from '#meta';
import {
  type CredentialForm,
  IntegrationCoordinator,
  IntegrationProvider,
  type IntegrationProviderEntry,
  Integration,
} from '#types';

/** Default credential form: matches the legacy custom-token UX (source/account/token). */
const DefaultCustomTokenForm = Schema.Struct({
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

type DefaultCustomTokenValues = Schema.Schema.Type<typeof DefaultCustomTokenForm>;

/**
 * Default `CredentialForm` retained for backwards compatibility — providers
 * with no `oauth` and no custom `credentialForm` get this rendering.
 */
const defaultCredentialForm: CredentialForm<DefaultCustomTokenValues> = {
  schema: DefaultCustomTokenForm,
  defaultValues: { source: '', token: '' },
  onSubmit: ({ values, provider }) =>
    Effect.sync(() => {
      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: values.source,
        account: values.account,
        token: values.token,
      });
      const integration = Obj.make(Integration.Integration, {
        name: provider.label ?? values.account ?? values.source,
        providerId: provider.id,
        accessToken: Ref.make(accessToken),
        targets: [],
      });
      return { accessToken, integration };
    }),
};

const resolveCredentialForm = (provider: IntegrationProviderEntry): CredentialForm<any> =>
  provider.credentialForm ?? defaultCredentialForm;

export type CustomTokenDialogProps = {
  db: Database.Database;
  providerId: string;
  /** Optional pre-filled label used as the new Integration's `name` (default form only). */
  providerLabel?: string;
};

/**
 * Dialog for integrations created without OAuth. Renders the provider's
 * `credentialForm` (or a default form for `{ source, account?, token }`)
 * and dispatches submission through the coordinator.
 */
export const CustomTokenDialog = ({ db, providerId }: CustomTokenDialogProps) => {
  const { t } = useTranslation(meta.id);
  const { invoke } = useOperationInvoker();
  const coordinator = useCapability(IntegrationCoordinator);
  const providers = useCapabilities(IntegrationProvider).flat();
  const provider = useMemo(() => providers.find((entry) => entry.id === providerId), [providers, providerId]);
  const credentialForm = useMemo(() => (provider ? resolveCredentialForm(provider) : defaultCredentialForm), [provider]);
  const [error, setError] = useState<string>();

  const handleSave = useCallback(
    (values: unknown) => {
      if (!provider) {
        setError(`Unknown provider: ${providerId}`);
        return;
      }
      setError(undefined);
      void runAndForwardErrors(
        Effect.gen(function* () {
          yield* coordinator.createCustomIntegrationFromForm({
            db,
            providerId,
            values,
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
    [coordinator, db, providerId, provider, invoke],
  );

  const title = provider?.label
    ? t('provider-form-dialog.title', { defaultValue: `Connect ${provider.label}`, label: provider.label })
    : t('custom-token-dialog.title', { defaultValue: 'Add custom token' });

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <Form.Root
          autoFocus
          schema={credentialForm.schema}
          defaultValues={credentialForm.defaultValues ?? {}}
          onSave={handleSave}
        >
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
