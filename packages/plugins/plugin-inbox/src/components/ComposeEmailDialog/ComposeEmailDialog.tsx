//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Format } from '@dxos/echo';
import { log } from '@dxos/log';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { useActiveSpace } from '@dxos/plugin-space';
import { Dialog, Message, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Message as MessageType } from '@dxos/types';

import { gmail } from '../../functions';
import { meta } from '../../meta';

export type ComposeEmailDialogProps = {
  mode?: 'compose' | 'reply' | 'reply-all' | 'forward';
  originalMessage?: MessageType.Message;
  subject?: string;
  body?: string;
};

const ComposeEmailForm = Schema.Struct({
  to: Schema.String.annotations({ description: 'Recipient email address' }),
  cc: Schema.optional(Schema.String.annotations({ description: 'CC recipients' })),
  bcc: Schema.optional(Schema.String.annotations({ description: 'BCC recipients' })),
  subject: Schema.optional(Schema.String.annotations({ description: 'Email subject' })),
  body: Schema.String.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ description: 'Email body' }),
  ),
});

type FormValues = Schema.Schema.Type<typeof ComposeEmailForm>;

const formatQuotedBody = (message: MessageType.Message): string => {
  const textBlock = message.blocks.find((b) => b._tag === 'text');
  const originalText = textBlock?.text ?? '';
  const senderName = message.sender?.name ?? message.sender?.email ?? 'Unknown';
  const date = message.created ? new Date(message.created).toLocaleString() : '';
  return `\n\n---\nOn ${date}, ${senderName} wrote:\n\n${originalText}`;
};

export const ComposeEmailDialog = ({ mode = 'compose', originalMessage, subject, body }: ComposeEmailDialogProps) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [error, setError] = useState<string | null>(null);

  const space = useActiveSpace();
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  const runtime = space?.id ? computeRuntime.getRuntime(space.id) : undefined;

  const initialValues = useMemo<FormValues>(() => {
    if (!originalMessage || mode === 'compose') {
      return { to: '', subject: subject ?? '', body: body ?? '' };
    }

    const originalSubject = originalMessage.properties?.subject ?? '';
    const quotedBody = formatQuotedBody(originalMessage);

    switch (mode) {
      case 'reply': {
        const senderEmail = originalMessage.sender?.email ?? '';
        const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
        return { to: senderEmail, subject, body: quotedBody };
      }
      case 'reply-all': {
        const senderEmail = originalMessage.sender?.email ?? '';
        const originalTo = originalMessage.properties?.to ?? '';
        const originalCc = originalMessage.properties?.cc ?? '';
        // Combine original To and Cc for the CC field, excluding sender (who becomes To).
        const ccRecipients = [originalTo, originalCc].filter((r) => r && r !== senderEmail).join(', ');
        const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
        return { to: senderEmail, cc: ccRecipients || undefined, subject, body: quotedBody };
      }
      case 'forward': {
        const subject = originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`;
        return { to: '', subject, body: quotedBody };
      }
      default:
        return { to: '', body: '' };
    }
  }, [mode, originalMessage, subject, body]);

  const dialogTitle = useMemo(() => {
    switch (mode) {
      case 'reply':
      case 'reply-all':
        return t('compose email dialog title reply');
      case 'forward':
        return t('compose email dialog title forward');
      default:
        return t('compose email dialog title');
    }
  }, [mode, t]);

  const handleSendEmail = useCallback(
    async (data: FormValues) => {
      setError(null);

      if (!runtime) {
        setError(t('send email error no runtime'));
        log.error('Runtime not available');
        return;
      }

      // Build threading properties for replies.
      const isReply = mode === 'reply' || mode === 'reply-all';
      const threadingProps: Record<string, string | undefined> = {};
      if (isReply && originalMessage) {
        threadingProps.threadId = originalMessage.properties?.threadId;
        threadingProps.inReplyTo = originalMessage.properties?.messageId;
        // Build references chain: existing references + original message ID.
        const existingRefs = originalMessage.properties?.references ?? '';
        const originalMsgId = originalMessage.properties?.messageId ?? '';
        threadingProps.references = [existingRefs, originalMsgId].filter(Boolean).join(' ');
      }

      // Create a Message object with the form data.
      const message = MessageType.make({
        created: new Date().toISOString(),
        sender: { name: 'Me' },
        blocks: [{ _tag: 'text', text: data.body }],
        properties: {
          to: data.to,
          cc: data.cc,
          bcc: data.bcc,
          subject: data.subject,
          ...threadingProps,
        },
      });

      try {
        await runtime.runPromise(invokeFunctionWithTracing(gmail.send, { message }));
        // Close the dialog after successful send.
        await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('send email error unknown');
        setError(errorMessage);
        log.error('Failed to send email', { error: err });
      }
    },
    [runtime, invokePromise, t, mode, originalMessage],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{dialogTitle}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton ref={closeRef} />
        </Dialog.Close>
      </Dialog.Header>
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
