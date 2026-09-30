//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useRef } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { translationKey } from '#translations';

// The current Form's modules import each other in a cycle that only resolves when `Form.tsx` is evaluated first.
import { Form as CurrentForm, type FormRootProps } from '../components/Form/Form.tsx';
import { useFormContext, useKeyHandler } from '../hooks/index.ts';
import { FormField } from './FormField.tsx';
import { FormFields } from './FormFields.tsx';
import { FormFieldSet } from './FormFieldSet.tsx';

/** The settings variant's two tracks (AUDIT §3.2 option 1): label and description, then the control. */
export const SETTINGS_COLUMNS = 'minmax(0, 1fr) [control] minmax(0, 1fr)';

//
// Viewport
//

export type FormViewportProps = PropsWithChildren<{
  /** Fill the parent and scroll, the rails hosting the scrollbar; a form in a `Next.Panel.Body` needs no Viewport. */
  scroll?: boolean;
  gutter?: Next.Gutter;
}>;

/** The gutter Container that owns the form's rails, optionally the viewport of a composed ScrollArea. */
export const FormViewport = ({ children, scroll, gutter = 'rail' }: FormViewportProps) =>
  scroll ? (
    <Next.ScrollArea.Root>
      <Next.ScrollArea.Viewport asChild>
        <Next.Container gutter={gutter}>{children}</Next.Container>
      </Next.ScrollArea.Viewport>
    </Next.ScrollArea.Root>
  ) : (
    <Next.Container gutter={gutter}>{children}</Next.Container>
  );

FormViewport.displayName = 'Form.Viewport';

//
// Content
//

export type FormContentProps = PropsWithChildren<{}>;

/**
 * The `form` element: a subgrid of its host, or in the `settings` variant a fresh template of two tracks that every
 * settings row and section below it shares.
 */
export const FormContent = ({ children }: FormContentProps) => {
  const { form, testId, variant } = useFormContext('Form.Content');
  const ref = useRef<HTMLDivElement>(null);
  useKeyHandler(ref, form);
  return (
    <Next.Container
      role='form'
      gutter='inherit'
      gap='md'
      columns={variant === 'settings' ? SETTINGS_COLUMNS : undefined}
      data-testid={testId}
      ref={ref}
    >
      {children}
    </Next.Container>
  );
};

FormContent.displayName = 'Form.Content';

//
// Actions
//

export type FormActionsProps = {
  submitLabel?: string;
  submitIcon?: string;
  submitDisabled?: boolean;
};

export const FormActions = ({ submitLabel, submitDisabled }: FormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const {
    form: { canSave, onSave, onCancel },
    readonly,
    layout,
  } = useFormContext('Form.Actions');
  if (readonly || layout === 'static') {
    return null;
  }

  return (
    <Next.Group justify='end'>
      {onCancel && (
        <Next.SystemButton.Cancel
          iconOnly={false}
          label={t('cancel-button.label')}
          onClick={onCancel}
          data-testid='cancel-button'
          // Inside a dialog this claims the initial focus, so a reflexive Enter dismisses rather than commits.
          {...{ [Next.DIALOG_AUTOFOCUS_ATTRIBUTE]: '' }}
        />
      )}
      {onSave && (
        <Next.SystemButton.Save
          iconOnly={false}
          type='submit'
          label={submitLabel ?? t('save-button.label')}
          disabled={!canSave || submitDisabled}
          onClick={() => onSave()}
          data-testid='save-button'
        />
      )}
    </Next.Group>
  );
};

FormActions.displayName = 'Form.Actions';

//
// Submit
//

export type FormSubmitProps = { label?: string; disabled?: boolean };

export const FormSubmit = ({ label, disabled }: FormSubmitProps) => {
  const { t } = useTranslation(translationKey);
  const {
    form: { canSave, onSave },
    readonly,
    layout,
  } = useFormContext('Form.Submit');
  if (readonly || layout === 'static') {
    return null;
  }

  return (
    <Next.Group fill>
      <Next.SystemButton.Save
        iconOnly={false}
        type='submit'
        label={label ?? t('save-button.label')}
        disabled={disabled ?? !canSave}
        onClick={() => onSave()}
        data-testid='save-button'
      />
    </Next.Group>
  );
};

FormSubmit.displayName = 'Form.Submit';

//
// ErrorText
//

export const FormErrorText = ({ children }: PropsWithChildren) =>
  children ? (
    <Next.Field.Root invalid>
      <Next.Field.ErrorText data-testid='form.error'>{children}</Next.Field.ErrorText>
    </Next.Field.Root>
  ) : null;

FormErrorText.displayName = 'Form.ErrorText';

/** The `Form` namespace of `@dxos/react-ui-form`, rendered with `@dxos/react-ui/next`; `Root` is the shared one. */
export const Form = {
  Root: CurrentForm.Root,
  Viewport: FormViewport,
  Content: FormContent,
  FieldSet: FormFieldSet,
  Fields: FormFields,
  Field: FormField,
  Actions: FormActions,
  Submit: FormSubmit,
  ErrorText: FormErrorText,
};

export type { FormRootProps };
