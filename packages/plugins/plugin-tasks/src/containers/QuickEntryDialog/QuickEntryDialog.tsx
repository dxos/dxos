//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Format } from '@dxos/echo';
import { Form, useFormContext } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';

import { meta } from '#meta';
import { OutlineOperation } from '#types';

const QuickEntryForm = Schema.Struct({
  text: Schema.String.pipe(
    Schema.check(Schema.makeFilter((value: string) => value.trim().length > 0 || 'Entry cannot be empty.')),
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotate({ description: 'Journal entry' }),
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
  const { t } = UiHooks.useTranslation(meta.profile.key);
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
    <div className='grid grid-flow-col gap-form-gap auto-cols-fr py-form-padding'>
      {onCancel && (
        <Button.Root
          iconEnd='ph--x--regular'
          label={t('quick-entry-cancel.label')}
          onClick={onCancel}
          data-testid='cancel-button'
        />
      )}
      <Button.Root
        disabled={!canSave}
        iconEnd='ph--plus--regular'
        label={t('quick-entry-save-and-continue.label')}
        onClick={handleSaveAndContinue}
        data-testid='save-and-continue-button'
      />
      <Button.Root
        type='submit'
        variant='primary'
        disabled={!canSave}
        iconEnd='ph--check--regular'
        label={t('quick-entry-save.label')}
        onClick={onSave}
        data-testid='save-button'
      />
    </div>
  );
};

export const QuickEntryDialog = () => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const [formKey, setFormKey] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef(false);
  const formSaveRef = useRef<(() => void) | null>(null);

  // Auto-focus the text input when the dialog opens or the form resets.
  // The selector matches a plain text input, a textarea, or CodeMirror's
  // contenteditable content node (used by the markdown form field).
  useEffect(() => {
    requestAnimationFrame(() => {
      const input = contentRef.current?.querySelector<HTMLElement>(
        'textarea, input[type="text"], [contenteditable="true"]',
      );
      input?.focus();
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
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
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
          <Form.Content>
            <Form.Fields />
            <QuickEntryActions continueRef={continueRef} formSaveRef={formSaveRef} />
          </Form.Content>
        </Form.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};

QuickEntryDialog.displayName = 'QuickEntryDialog';
