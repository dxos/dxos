//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type Database, type Key } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Column, Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Connector, ConnectorCoordinator } from '#types';

export type CustomTokenDialogProps = {
  db: Database.Database;
  spaceId: Key.SpaceId;
  connectorId: string;
  /** Optional pre-filled label used as the new Connection's `name`. */
  connectorLabel?: string;
};

/**
 * Per-connector credential / pre-flight form. Renders the connector's
 * declared `credentialForm.schema` and dispatches submission through the
 * coordinator, which decides whether the result completes the connection
 * (custom token, IMAP) or initiates an OAuth flow with a `loginHint`
 * (atproto handle).
 *
 * The component name is retained from the legacy custom-token dialog; the
 * surface id is `PROVIDER_FORM_DIALOG`.
 */
export const CustomTokenDialog = ({ db, spaceId, connectorId, connectorLabel }: CustomTokenDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invoke } = useOperationInvoker();
  const coordinator = useCapability(ConnectorCoordinator);
  const connectors = useCapabilities(Connector).flat();
  const connector = useMemo(() => connectors.find((entry) => entry.id === connectorId), [connectors, connectorId]);
  const credentialForm = connector?.credentialForm;
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  const handleSave = useCallback(
    (values: unknown) => {
      if (!connector) {
        setError(`Unknown connector: ${connectorId}`);
        return;
      }
      setError(undefined);
      setIsPending(true);

      const validationEffect = credentialForm?.onValidate
        ? credentialForm.onValidate({ values: values as never, connector })
        : Effect.void;

      void EffectEx.runAndForwardErrors(
        validationEffect.pipe(
          Effect.andThen(
            Effect.gen(function* () {
              // Close the dialog before re-entering the coordinator so OAuth
              // popups / new tabs aren't blocked by a stacked layout op.
              yield* invoke(LayoutOperation.UpdateDialog, { state: false });
              yield* coordinator.submitCredentialForm({ db, spaceId, connectorId, values });
            }),
          ),
          Effect.catchAll((failure) =>
            Effect.sync(() => {
              log.catch(failure);
              setError(String(failure instanceof Error ? failure.message : failure));
              setIsPending(false);
            }),
          ),
        ),
      );
    },
    [coordinator, credentialForm, db, spaceId, connectorId, connector, invoke],
  );

  if (!credentialForm) {
    return (
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{connectorLabel ?? connectorId}</Dialog.Title>
          <Dialog.Close asChild>
            <Dialog.ActionIconButton action='close' />
          </Dialog.Close>
        </Dialog.Header>
        <Dialog.Body>
          <p className='text-error'>{t('provider-form-dialog.no-form.message')}</p>
        </Dialog.Body>
      </Dialog.Content>
    );
  }

  const title = connector?.label
    ? t('provider-form-dialog.title', { label: connector.label })
    : t('custom-token-dialog.title');

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <Form.Root
          autoFocus
          schema={credentialForm.schema}
          defaultValues={credentialForm.defaultValues ?? {}}
          onSave={handleSave}
        >
          <Column.Center>
            <Form.Content>
              <Form.FieldSet />
              <Form.Submit disabled={isPending ? true : undefined} />
            </Form.Content>
          </Column.Center>
        </Form.Root>
        {error && <p className='text-error'>{error}</p>}
      </Dialog.Body>
    </Dialog.Content>
  );
};
