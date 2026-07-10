//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Column, IconButton, useThemeContext, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Editor, EditorViewProps } from '@dxos/react-ui-editor';
import { Form, FormRootProps } from '@dxos/react-ui-form';
import { type Message as MessageType } from '@dxos/types';
import { Extension, compactSlots, createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { meta } from '#meta';

const MessageProperties = Schema.Struct({
  to: Schema.String.annotations({ description: 'Recipient email address' }),
  cc: Schema.optional(Schema.String.annotations({ description: 'CC recipients' })),
  bcc: Schema.optional(Schema.String.annotations({ description: 'BCC recipients' })),
  subject: Schema.optional(Schema.String.annotations({ description: 'Subject' })),
});

interface MessageProperties extends Schema.Schema.Type<typeof MessageProperties> {}

export type EditMessageProps = {
  message: MessageType.Message;
  extensions?: Extension[];
  onSend?: (message: MessageType.Message) => Promise<void>;
  /** Optional header title (e.g. "Draft"); shown with the delete affordance when provided. */
  title?: string;
  /** When set, renders a delete button in the header that discards the message. */
  onDelete?: () => void;
};

export const EditMessage = composable<HTMLDivElement, EditMessageProps>(
  ({ message, extensions, onSend, title, onDelete, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    const { themeMode } = useThemeContext();

    const extension = useMemo(
      () =>
        [
          createBasicExtensions({ placeholder: t('message-body.placeholder') }),
          createThemeExtensions({ themeMode, slots: compactSlots }),
          extensions,
        ].filter(isTruthy),
      [t, themeMode, extensions],
    );

    const initialValues = useMemo<FormRootProps<MessageProperties>['defaultValues']>(
      () => message.properties,
      [message],
    );

    const handleValuesChanged = useCallback<NonNullable<FormRootProps<MessageProperties>['onValuesChanged']>>(
      (values) => {
        Obj.update(message, (message) => {
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
        Obj.update(message, (message) => {
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

    // Send success/failure is surfaced via toasts by the caller's `onSend` (see `useSendEmail`).
    const handleSave = useCallback<NonNullable<FormRootProps<MessageProperties>['onSave']>>(async () => {
      await onSend?.(message);
    }, [onSend, message]);

    const showHeader = title != null || !!onDelete;

    return (
      <Column.Root
        {...composableProps(props, {
          classNames: showHeader
            ? 'grid-rows-[min-content_min-content_1fr_min-content]'
            : 'grid-rows-[min-content_1fr_min-content]',
        })}
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
          {showHeader && (
            <Column.Center classNames='flex items-center justify-between pbs-form-gap'>
              <h2 className='text-lg'>{title}</h2>
              {onDelete && (
                <IconButton
                  iconOnly
                  variant='ghost'
                  icon='ph--trash--regular'
                  label={t('delete-draft-button.label')}
                  onClick={onDelete}
                />
              )}
            </Column.Center>
          )}
          <Column.Center>
            <Form.Content>
              <Form.FieldSet />
            </Form.Content>
          </Column.Center>
          <Column.Center classNames='pbs-form-gap'>
            <Editor.Root>
              <Editor.View
                classNames='dx-expander border border-separator'
                extensions={extension}
                // `value` (not `initialValue`): `Editor.View`'s controlled-value sync clears the doc to
                // '' when `value` is undefined, which would wipe an `initialValue`. Fall back to '' so a
                // missing text block doesn't flip undefined→'' after mount.
                value={message.blocks?.find((b) => b._tag === 'text')?.text ?? ''}
                onChange={(value) => {
                  handleBodyChanged(value);
                }}
              />
            </Editor.Root>
          </Column.Center>
          <Column.Center classNames='pb-form-padding'>
            <Form.Submit icon='ph--paper-plane-right--regular' label={t('send-email-button.label')} />
          </Column.Center>
        </Form.Root>
      </Column.Root>
    );
  },
);
