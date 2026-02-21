//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Format } from '@dxos/echo';
import { Message, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Message as MessageType } from '@dxos/types';

import { meta } from '../../meta';

//
// ComposeEmailPanel
//

export type ComposeEmailPanelProps = {
  mode?: 'compose' | 'reply' | 'reply-all' | 'forward';
  message?: MessageType.Message;
  subject?: string;
  body?: string;
  onSend?: (message: MessageType.Message) => Promise<void>;
};

export const ComposeEmailPanel = ({
  mode = 'compose',
  message: messageProp,
  subject,
  body,
  onSend,
}: ComposeEmailPanelProps) => {
  const { t } = useTranslation(meta.id);
  const [error, setError] = useState<string | null>(null);

  const initialValues = useMemo<ComposeEmailForm>(() => {
    if (!messageProp || mode === 'compose') {
      return { to: '', subject: subject ?? '', body: body ?? '' };
    }

    const originalSubject = messageProp.properties?.subject ?? '';
    const quotedBody = formatQuotedBody(messageProp);

    switch (mode) {
      case 'reply': {
        const senderEmail = messageProp.sender?.email ?? '';
        const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
        return { to: senderEmail, subject, body: quotedBody };
      }
      case 'reply-all': {
        const senderEmail = messageProp.sender?.email ?? '';
        const originalTo = messageProp.properties?.to ?? '';
        const originalCc = messageProp.properties?.cc ?? '';
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
  }, [mode, messageProp, subject, body]);

  const handleSendEmail = useCallback(
    async (data: ComposeEmailForm) => {
      setError(null);

      // Build threading properties for replies.
      const isReply = mode === 'reply' || mode === 'reply-all';
      const threadingProps: Record<string, string | undefined> = {};
      if (isReply && messageProp) {
        threadingProps.threadId = messageProp.properties?.threadId;
        threadingProps.inReplyTo = messageProp.properties?.messageId;
        // Build references chain: existing references + original message ID.
        const existingRefs = messageProp.properties?.references ?? '';
        const originalMsgId = messageProp.properties?.messageId ?? '';
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
        await onSend?.(message);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('send email error unknown');
        setError(errorMessage);
      }
    },
    [t, onSend, mode, messageProp],
  );

  return (
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
  );
};

//
// ComposeEmailForm
//

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

type ComposeEmailForm = Schema.Schema.Type<typeof ComposeEmailForm>;

const formatQuotedBody = (message: MessageType.Message): string => {
  const textBlock = message.blocks.find((b) => b._tag === 'text');
  const originalText = textBlock?.text ?? '';
  const senderName = message.sender?.name ?? message.sender?.email ?? 'Unknown';
  const date = message.created ? new Date(message.created).toLocaleString() : '';
  return `\n\n---\nOn ${date}, ${senderName} wrote:\n\n${originalText}`;
};
