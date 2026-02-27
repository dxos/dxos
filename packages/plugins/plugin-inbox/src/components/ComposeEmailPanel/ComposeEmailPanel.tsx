//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Format, Obj } from '@dxos/echo';
import { Message, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { type Message as MessageType } from '@dxos/types';

import { meta } from '../../meta';

//
// ComposeEmailPanel
//

export type ComposeEmailPanelProps = {
  /** Draft to edit. Form is bound to it (initial values, autosave, send uses it). */
  draft: MessageType.Message;
  onSend?: (message: MessageType.Message) => Promise<void>;
};

export const ComposeEmailPanel = ({ draft, onSend }: ComposeEmailPanelProps) => {
  const { t } = useTranslation(meta.id);
  const [error, setError] = useState<string | null>(null);

  const initialValues = useMemo<ComposeEmailForm>(() => {
    const textBlock = draft.blocks.find((b) => b._tag === 'text');
    return {
      to: draft.properties?.to ?? '',
      cc: draft.properties?.cc,
      bcc: draft.properties?.bcc,
      subject: draft.properties?.subject ?? '',
      body: textBlock?.text ?? '',
    };
  }, [draft]);

  const handleValuesChanged = useCallback(
    (newValues: Partial<ComposeEmailForm>) => {
      Obj.change(draft, (msg) => {
        const properties = (msg.properties ??= {});
        if (newValues.to !== undefined) properties.to = newValues.to;
        if (newValues.cc !== undefined) properties.cc = newValues.cc;
        if (newValues.bcc !== undefined) properties.bcc = newValues.bcc;
        if (newValues.subject !== undefined) properties.subject = newValues.subject;
        if (newValues.body !== undefined) {
          const textBlock = msg.blocks.find((b) => b._tag === 'text');
          if (textBlock && 'text' in textBlock) {
            textBlock.text = newValues.body;
          } else {
            msg.blocks.push({ _tag: 'text', text: newValues.body });
          }
        }
      });
    },
    [draft],
  );

  const handleSendEmail = useCallback(
    async (_data: ComposeEmailForm) => {
      setError(null);
      // Draft is already updated via onValuesChanged; just send it.
      try {
        await onSend?.(draft);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('send email error unknown');
        setError(errorMessage);
      }
    },
    [t, onSend, draft],
  );

  return (
    <Form.Root
      testId='compose-email-form'
      autoFocus
      schema={ComposeEmailForm}
      values={initialValues}
      onValuesChanged={handleValuesChanged}
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

export const ComposeEmailForm = Schema.Struct({
  to: Schema.String.annotations({ description: 'Recipient email address' }),
  cc: Schema.optional(Schema.String.annotations({ description: 'CC recipients' })),
  bcc: Schema.optional(Schema.String.annotations({ description: 'BCC recipients' })),
  subject: Schema.optional(Schema.String.annotations({ description: 'Email subject' })),
  body: Schema.String.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ description: 'Email body' }),
  ),
});

export type ComposeEmailForm = Schema.Schema.Type<typeof ComposeEmailForm>;
