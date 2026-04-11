//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Format } from '@dxos/echo';
import { Dialog, IconButton, useTranslation } from '@dxos/react-ui';
import { Form, useFormContext } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { OutlineOperation } from '#operations';

const QuickEntryForm = Schema.Struct({
  text: Schema.String.pipe(
    Schema.filter((value) => value.trim().length > 0, { message: () => 'Entry cannot be empty.' }),
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ description: 'Journal entry' }),
  ),
});

type QuickEntryForm = Schema.Schema.Type<typeof QuickEntryForm>;

const QUICK_ENTRY_ACTIONS_NAME = 'QuickEntryActions';

type QuickEntryActionsProps = {
  continueRef: { current: boolean };
  formSaveRef: { current: (() => void) | null };
};

/**
 * Custom form actions with Cancel, Save & Add Another, and Save buttons.
 */
const QuickEntryActions = ({ continueRef, formSaveRef }: QuickEntryActionsProps) => {
  const { t } = useTranslation(meta.id);
  const {
    form: { canSave, onSave, onCancel },
  } = useFormContext(QUICK_ENTRY_ACTIONS_NAME);

  // Expose save function for keyboard shortcut handler.
  useEffect(() => {
    formSaveRef.current = canSave ? onSave : null;
  }, [canSave, onSave, formSaveRef]);

  const handleSaveAndContinue = useCallback(() => {
    continueRef.current = true;
    onSave();
  }, [onSave, continueRef]);

  return (
    <div role='none' className='grid grid-flow-col gap-form-gap auto-cols-fr py-form-padding'>
      {onCancel && (
        <IconButton
          icon='ph--x--regular'
          iconEnd
          label={t('quick-entry-cancel.label')}
          onClick={onCancel}
          data-testid='cancel-button'
        />
      )}
      <IconButton
        disabled={!canSave}
        icon='ph--plus--regular'
        iconEnd
        label={t('quick-entry-save-and-continue.label')}
        onClick={handleSaveAndContinue}
        data-testid='save-and-continue-button'
      />
      <IconButton
        type='submit'
        variant='primary'
        disabled={!canSave}
        icon='ph--check--regular'
        iconEnd
        label={t('quick-entry-save.label')}
        onClick={onSave}
        data-testid='save-button'
      />
    </div>
  );
};

export const QuickEntryDialog = () => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [formKey, setFormKey] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef(false);
  const formSaveRef = useRef<(() => void) | null>(null);

  // Auto-focus the text input when the dialog opens or the form resets.
  useEffect(() => {
    requestAnimationFrame(() => {
      const input = contentRef.current?.querySelector('textarea, input[type="text"]');
      if (input instanceof HTMLElement) {
        input.focus();
      }
    });
  }, [formKey]);

  const handleSave = useCallback(
    async (values: QuickEntryForm) => {
      await invokePromise(OutlineOperation.QuickJournalEntry, { text: values.text.trim() });
      if (continueRef.current) {
        continueRef.current = false;
        setFormKey((key) => key + 1);
      } else {
        await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      }
    },
    [invokePromise],
  );

  const handleCancel = useCallback(async () => {
    await invokePromise(LayoutOperation.UpdateDialog, { state: false });
  }, [invokePromise]);

  // Handle Cmd+Shift+Enter for "Save & Add Another".
  const handleKeyDownCapture = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' && event.metaKey && event.shiftKey) {
      event.stopPropagation();
      event.preventDefault();
      continueRef.current = true;
      formSaveRef.current?.();
    }
  }, []);

  return (
    <Dialog.Content ref={contentRef} onKeyDownCapture={handleKeyDownCapture}>
      <Dialog.Header>
        <Dialog.Title>{t('quick-entry-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <Form.Root
          key={formKey}
          autoFocus
          schema={QuickEntryForm}
          defaultValues={{ text: '' }}
          onSave={handleSave}
          onCancel={handleCancel}
        >
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet />
              <QuickEntryActions continueRef={continueRef} formSaveRef={formSaveRef} />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};
