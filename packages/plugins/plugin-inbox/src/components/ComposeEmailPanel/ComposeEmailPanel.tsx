//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Column, Message, useThemeContext, useTranslation } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { Form } from '@dxos/react-ui-form';
import { type Message as MessageType } from '@dxos/types';
import { compactSlots, createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '#meta';

//
// ComposeEmailPanel
//

export type ComposeEmailPanelProps = {
  /** Draft to edit. Form is bound to it (initial values, autosave, send uses it). */
  message: MessageType.Message;
  onSend?: (message: MessageType.Message) => Promise<void>;
};

export const ComposeEmailPanel = composable<HTMLDivElement, ComposeEmailPanelProps>(
  ({ message: draft, onSend, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();
    const [error, setError] = useState<string | null>(null);

    const initialValues = useMemo<ComposeEmail>(() => {
      return {
        to: draft.properties?.to ?? '',
        cc: draft.properties?.cc,
        bcc: draft.properties?.bcc,
        subject: draft.properties?.subject ?? '',
      };
    }, [draft]);

    const handleValuesChanged = useCallback(
      (newValues: Partial<ComposeEmail>) => {
        Obj.change(draft, (draft) => {
          const properties = (draft.properties ??= {});
          if (newValues.to !== undefined) {
            properties.to = newValues.to;
          }
          if (newValues.cc !== undefined) {
            properties.cc = newValues.cc;
          }
          if (newValues.bcc !== undefined) {
            properties.bcc = newValues.bcc;
          }
          if (newValues.subject !== undefined) {
            properties.subject = newValues.subject;
          }
        });
      },
      [draft],
    );

    const handleBodyChanged = useCallback(
      (value: string) => {
        Obj.change(draft, (draft) => {
          const blocks = (draft.blocks ??= []);
          const textBlock = blocks.find((b) => b._tag === 'text');
          if (textBlock && 'text' in textBlock) {
            textBlock.text = value;
          } else {
            blocks.push({ _tag: 'text', text: value });
          }
        });
      },
      [draft],
    );

    const handleSendEmail = useCallback(
      async (_data: ComposeEmail) => {
        try {
          setError(null);
          await onSend?.(draft);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : t('send-email-error-unknown.message');
          setError(errorMessage);
        }
      },
      [t, onSend, draft],
    );

    // TODO(burdon): Reconcile with Typewriter in plugin-assistant.
    const extension = useMemo(
      () => [
        createBasicExtensions({ scrollPastEnd: true, search: true, placeholder: t('message-body.placeholder') }),
        createThemeExtensions({ themeMode, slots: compactSlots }),
      ],
      [t, themeMode],
    );

    return (
      <Column.Root
        {...composableProps(props, { classNames: 'grid-rows-[min-content_1fr_min-content]' })}
        gutter='sm'
        ref={forwardedRef}
      >
        <Form.Root
          autoFocus
          schema={ComposeEmail}
          defaultValues={initialValues}
          onValuesChanged={handleValuesChanged}
          onSave={handleSendEmail}
          testId='compose-email-form'
        >
          <Column.Center>
            <Form.Content>
              <Form.FieldSet />
              {error && (
                <Message.Root valence='error'>
                  <Message.Title>{t('send-email-error.title')}</Message.Title>
                  <Message.Content>{error}</Message.Content>
                </Message.Root>
              )}
            </Form.Content>
          </Column.Center>

          <Column.Center>
            <Editor.Root>
              <Editor.Content
                classNames='dx-expander border border-subdued-separator'
                extensions={extension}
                initialValue={draft.blocks.find((b) => b._tag === 'text')?.text ?? ''}
                onChange={(value) => {
                  handleBodyChanged(value);
                }}
              />
            </Editor.Root>
          </Column.Center>

          <Column.Center classNames='pb-form-gap'>
            <Form.Submit icon='ph--paper-plane-right--regular' label={t('send-email-button.label')} />
          </Column.Center>
        </Form.Root>
      </Column.Root>
    );
  },
);

//
// ComposeEmail
//

export const ComposeEmail = Schema.Struct({
  to: Schema.String.annotations({ description: 'Recipient email address' }),
  cc: Schema.optional(Schema.String.annotations({ description: 'CC recipients' })),
  bcc: Schema.optional(Schema.String.annotations({ description: 'BCC recipients' })),
  subject: Schema.optional(Schema.String.annotations({ description: 'Email subject' })),
  // body: Schema.String.pipe(
  //   Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
  //   Schema.annotations({ description: 'Email body' }),
  // ),
});

export interface ComposeEmail extends Schema.Schema.Type<typeof ComposeEmail> {}
