//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useRef, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { useCapability, useOperationInvoker } from '@dxos/app-framework/react';
import { Format } from '@dxos/echo';
import { log } from '@dxos/log';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { useActiveSpace } from '@dxos/plugin-space';
import { Dialog, IconButton, Message, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { cardDialogContent, cardDialogHeader } from '@dxos/react-ui-mosaic';
import { Message as MessageType } from '@dxos/types';

import { gmail } from '../../functions';
import { meta } from '../../meta';

const ComposeEmailForm = Schema.Struct({
  to: Schema.String.annotations({ description: 'Recipient email address' }),
  subject: Schema.optional(Schema.String.annotations({ description: 'Email subject' })),
  body: Schema.String.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ description: 'Email body' }),
  ),
});

type FormValues = Schema.Schema.Type<typeof ComposeEmailForm>;

const initialValues: FormValues = { to: '', body: '' };

export const ComposeEmailDialog = () => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [error, setError] = useState<string | null>(null);

  const space = useActiveSpace();
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  const runtime = space?.id ? computeRuntime.getRuntime(space.id) : undefined;

  const handleSendEmail = useCallback(
    async (data: FormValues) => {
      setError(null);

      if (!runtime) {
        setError(t('send email error no runtime'));
        log.error('Runtime not available');
        return;
      }

      // Create a Message object with the form data.
      const message = MessageType.make({
        created: new Date().toISOString(),
        sender: { name: 'Me' },
        blocks: [{ _tag: 'text', text: data.body }],
        properties: {
          to: data.to,
          subject: data.subject,
        },
      });

      try {
        await runtime.runPromise(invokeFunctionWithTracing(gmail.send, { message }));
        // Close the dialog after successful send.
        await invokePromise(Common.LayoutOperation.UpdateDialog, { state: false });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('send email error unknown');
        setError(errorMessage);
        log.error('Failed to send email', { error: err });
      }
    },
    [runtime, invokePromise, t],
  );

  return (
    <Dialog.Content classNames={cardDialogContent}>
      <div role='none' className={cardDialogHeader}>
        <Dialog.Title>{t('compose email dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <IconButton
            ref={closeRef}
            icon='ph--x--regular'
            size={4}
            label={t('close label')}
            iconOnly
            density='fine'
            variant='ghost'
            autoFocus
          />
        </Dialog.Close>
      </div>
      <Form.Root
        testId='compose-email-form'
        autoFocus
        schema={ComposeEmailForm}
        values={initialValues}
        onSave={handleSendEmail}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
            {error && (
              <Message.Root valence='error'>
                <Message.Title>{t('send email error title')}</Message.Title>
                <Message.Content>{error}</Message.Content>
              </Message.Root>
            )}
            <Form.Submit icon='ph--paper-plane-right--regular' label={t('send email button label')} />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Dialog.Content>
  );
};
