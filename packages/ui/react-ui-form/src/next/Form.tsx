//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, forwardRef, useRef } from 'react';

import { useComposedRefs } from '@dxos/react-hooks';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { translationKey } from '#translations';

import { FormRoot, type FormRootProps } from '../components/Form/FormControls.tsx';
import { useFormContext, useKeyHandler } from '../hooks/index.ts';
import { FormField } from './FormField.tsx';
import { FormFields } from './FormFieldDispatch.tsx';
import { FormFieldSet } from './FormFieldSet.tsx';
import { FormLayoutController } from './FormLayout.tsx';

/** The settings variant's two tracks (AUDIT §3.2 option 1): label and description, then the control. */
export const SETTINGS_COLUMNS = 'minmax(0, 1fr) [control] minmax(0, 1fr)';

//
// Viewport
//

export type FormViewportProps = PropsWithChildren<{
  /**
   * Fill the parent and scroll: the form becomes its own pane (a `Next.Panel` whose Body is a ScrollArea around the
   * gutter Container), so it is sized, collapses its rails against its own width and hosts the scrollbar in its end
   * rail. A form already inside a scrolling gutter Container needs no Viewport.
   */
  scroll?: boolean;
  /** The pane's size when `scroll`; otherwise the form inherits its host's. */
  size?: Next.PanelRootProps['size'];
  gutter?: Next.Gutter;
}>;

/** The gutter Container that owns the form's rails; with `scroll`, the Body of a pane of its own. */
export const FormViewport = ({ children, scroll, size, gutter = 'rail' }: FormViewportProps) =>
  scroll ? (
    <Next.Panel.Root size={size}>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root>
          <Next.ScrollArea.Viewport asChild>
            <Next.Container gutter={gutter}>{children}</Next.Container>
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
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
 * settings row and section below it shares. Forwards its ref so a consumer can scope its own key handling to the form.
 */
export const FormContent = forwardRef<HTMLDivElement, FormContentProps>(({ children }, forwardedRef) => {
  const { form, testId, variant } = useFormContext('Form.Content');
  const localRef = useRef<HTMLDivElement>(null);
  const ref = useComposedRefs(forwardedRef, localRef);
  useKeyHandler(localRef, form);
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
});

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

export type FormSubmitProps = {
  label?: string;
  disabled?: boolean;
  /** Replaces Save's check, for a submit that is not a save (e.g. send). */
  icon?: string;
  /** Spins the icon while the submission is in flight. */
  busy?: boolean;
};

export const FormSubmit = ({ label, disabled, icon, busy }: FormSubmitProps) => {
  const { t } = useTranslation(translationKey);
  const {
    form: { canSave, onSave },
    readonly,
    layout,
  } = useFormContext('Form.Submit');
  if (readonly || layout === 'static') {
    return null;
  }

  const buttonProps = {
    type: 'submit',
    label: label ?? t('save-button.label'),
    disabled: disabled ?? !canSave,
    onClick: () => onSave(),
    'data-testid': 'save-button',
  } as const;

  return (
    <Next.Group fill>
      {icon || busy ? (
        <Next.Button {...buttonProps} variant='primary' icon={icon ?? 'ph--check--regular'} spin={busy} />
      ) : (
        <Next.SystemButton.Save {...buttonProps} iconOnly={false} />
      )}
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
  Root: FormRoot,
  Viewport: FormViewport,
  Content: FormContent,
  FieldSet: FormFieldSet,
  Fields: FormFields,
  Layout: FormLayoutController,
  Field: FormField,
  Actions: FormActions,
  Submit: FormSubmit,
  ErrorText: FormErrorText,
};

export type { FormRootProps };
