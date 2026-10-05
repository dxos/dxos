//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Database, type Key, type Obj, type Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { Dialog, SystemButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { ConnectorCoordination, ConnectorSpec } from '#types';

export type CustomTokenDialogProps = {
  db: Database.Database;
  spaceId: Key.SpaceId;
  connectorId: string;
  /** Optional pre-filled label used as the new Connection's `name`. */
  connectorLabel?: string;
  /** Existing local object to bind as the connection's sync target (e.g. an empty mailbox). */
  existingTarget?: Ref.Ref<Obj.Unknown>;
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
export const CustomTokenDialog = ({
  db,
  spaceId,
  connectorId,
  connectorLabel,
  existingTarget,
}: CustomTokenDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invoke } = Hooks.useOperationInvoker();
  const coordinator = Hooks.useCapability(ConnectorCoordination.ConnectorCoordinator);
  const connectors = Hooks.useCapabilities(ConnectorSpec.Connector).flat();
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
              yield* coordinator.submitCredentialForm({ db, spaceId, connectorId, values, existingTarget });
            }),
          ),
          Effect.catch((failure) =>
            Effect.sync(() => {
              log.catch(failure);
              setError(String(failure instanceof Error ? failure.message : failure));
              setIsPending(false);
            }),
          ),
        ),
      );
    },
    [coordinator, credentialForm, db, spaceId, connectorId, connector, invoke, existingTarget],
  );

  if (!credentialForm) {
    return (
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{connectorLabel ?? connectorId}</Dialog.Title>
          <Dialog.CloseTrigger asChild>
            <SystemButton.Close />
          </Dialog.CloseTrigger>
        </Dialog.Header>
        <Dialog.Body>
          <p className='text-error-text'>{t('provider-form-dialog.no-form.message')}</p>
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
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
      </Dialog.Header>
      <Dialog.Body>
        <Form.Root
          autoFocus
          schema={credentialForm.schema}
          defaultValues={credentialForm.defaultValues ?? {}}
          onSave={handleSave}
        >
          <Form.Content>
            <Form.Fields />
            <Form.Submit disabled={isPending ? true : undefined} />
          </Form.Content>
        </Form.Root>
        {error && <p className='text-error-text'>{error}</p>}
      </Dialog.Body>
    </Dialog.Content>
  );
};

CustomTokenDialog.displayName = 'CustomTokenDialog';
