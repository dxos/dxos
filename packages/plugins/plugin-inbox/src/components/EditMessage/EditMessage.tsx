//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Column, Message, useThemeContext, useTranslation } from '@dxos/react-ui';
import { Editor, EditorViewProps } from '@dxos/react-ui-editor';
import { Form, FormRootProps } from '@dxos/react-ui-form';
import { type Message as MessageType } from '@dxos/types';
import { compactSlots, createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '#meta';

const MessageProperties = Schema.Struct({
  to: Schema.String.annotations({ description: 'Recipient email address' }),
  cc: Schema.optional(Schema.String.annotations({ description: 'CC recipients' })),
  bcc: Schema.optional(Schema.String.annotations({ description: 'BCC recipients' })),
  subject: Schema.optional(Schema.String.annotations({ description: 'Subject' })),
});

interface MessageProperties extends Schema.Schema.Type<typeof MessageProperties> {}

export type EditMessageProps = {
  /** Draft to edit. Form is bound to it (initial values, autosave, send uses it). */
  message: MessageType.Message;
  onSend?: (message: MessageType.Message) => Promise<void>;
};

export const EditMessage = composable<HTMLDivElement, EditMessageProps>(
  ({ message, onSend, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();
    const [error, setError] = useState<string | null>(null);

    // TODO(burdon): Reconcile with Typewriter in plugin-assistant.
    const extension = useMemo(
      () => [
        createBasicExtensions({ placeholder: t('message-body.placeholder') }),
        createThemeExtensions({ themeMode, slots: compactSlots }),
      ],
      [t, themeMode, message],
    );

    const initialValues = useMemo<FormRootProps<MessageProperties>['defaultValues']>(
      () => message.properties,
      [message],
    );

    const handleValuesChanged = useCallback<NonNullable<FormRootProps<MessageProperties>['onValuesChanged']>>(
      (values) => {
        Obj.change(message, (message) => {
          const properties = (message.properties ??= {});
          if (values.to !== undefined) {
            properties.to = values.to;
          }
          if (values.cc !== undefined) {
            properties.cc = values.cc;
          }
          if (values.bcc !== undefined) {
            properties.bcc = values.bcc;
          }
          if (values.subject !== undefined) {
            properties.subject = values.subject;
          }
        });
      },
      [message],
    );

    const handleBodyChanged = useCallback<NonNullable<EditorViewProps['onChange']>>(
      (value) => {
        Obj.change(message, (message) => {
          const blocks = (message.blocks ??= []);
          const textBlock = blocks.find((b) => b._tag === 'text');
          if (textBlock && 'text' in textBlock) {
            textBlock.text = value;
          } else {
            blocks.push({ _tag: 'text', text: value });
          }
        });
      },
      [message],
    );

    const handleSave = useCallback<NonNullable<FormRootProps<MessageProperties>['onSave']>>(async () => {
      try {
        setError(null);
        await onSend?.(message);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('send-email-error-unknown.message');
        setError(errorMessage);
      }
    }, [t, onSend, message]);

    return (
      <Column.Root
        {...composableProps(props, { classNames: 'grid-rows-[min-content_1fr_min-content]' })}
        gutter='sm'
        ref={forwardedRef}
      >
        <Form.Root<MessageProperties>
          autoFocus
          schema={MessageProperties}
          defaultValues={initialValues}
          onValuesChanged={handleValuesChanged}
          onSave={handleSave}
          testId='edit-email-form'
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
              <Editor.View
                classNames='dx-expander border border-subdued-separator'
                extensions={extension}
                initialValue={message.blocks?.find((b) => b._tag === 'text')?.text}
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
