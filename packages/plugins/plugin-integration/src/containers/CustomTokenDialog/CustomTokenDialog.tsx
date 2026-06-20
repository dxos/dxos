//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type Database, type Key, type Obj, type Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Column, Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { IntegrationCoordinator, IntegrationProvider } from '#types';

export type CustomTokenDialogProps = {
  db: Database.Database;
  spaceId: Key.SpaceId;
  providerId: string;
  /** Optional pre-filled label used as the new Integration's `name`. */
  providerLabel?: string;
  /** Existing local object the user is connecting from — wired through to the new Integration's first target. */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Per-provider credential / pre-flight form. Renders the provider's
 * declared `credentialForm.schema` and dispatches submission through the
 * coordinator, which decides whether the result completes the integration
 * (custom token, IMAP) or initiates an OAuth flow with a `loginHint`
 * (atproto handle).
 *
 * The component name is retained from the legacy custom-token dialog for
 * compatibility; the surface id is `PROVIDER_FORM_DIALOG`.
 */
export const CustomTokenDialog = ({
  db,
  spaceId,
  providerId,
  providerLabel,
  existingTarget,
}: CustomTokenDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invoke } = useOperationInvoker();
  const coordinator = useCapability(IntegrationCoordinator);
  const providers = useCapabilities(IntegrationProvider).flat();
  const provider = useMemo(() => providers.find((entry) => entry.id === providerId), [providers, providerId]);
  const credentialForm = provider?.credentialForm;
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  const handleSave = useCallback(
    (values: unknown) => {
      if (!provider) {
        setError(`Unknown provider: ${providerId}`);
        return;
      }
      setError(undefined);
      setIsPending(true);

      const validationEffect = credentialForm?.onValidate
        ? credentialForm.onValidate({ values: values as never, provider })
        : Effect.void;

      void EffectEx.runAndForwardErrors(
        validationEffect.pipe(
          Effect.andThen(
            Effect.gen(function* () {
              // Close the dialog before re-entering the coordinator so OAuth
              // popups / new tabs aren't blocked by a stacked layout op.
              yield* invoke(LayoutOperation.UpdateDialog, { state: false });
              yield* coordinator.submitCredentialForm({ db, spaceId, providerId, values, existingTarget });
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
    [coordinator, credentialForm, db, spaceId, providerId, provider, invoke, existingTarget],
  );

  if (!credentialForm) {
    return (
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{providerLabel ?? providerId}</Dialog.Title>
          <Dialog.Close asChild>
            <Dialog.ActionIconButton action='close' />
          </Dialog.Close>
        </Dialog.Header>
        <Dialog.Body>
          <p className='text-error'>
            {t('provider-form-dialog.no-form.message', {
              defaultValue: 'Provider has no credential form configured.',
            })}
          </p>
        </Dialog.Body>
      </Dialog.Content>
    );
  }

  const title = provider?.label
    ? t('provider-form-dialog.title', { defaultValue: `Connect ${provider.label}`, label: provider.label })
    : t('custom-token-dialog.title', { defaultValue: 'Add custom token' });

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
