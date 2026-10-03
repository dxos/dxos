//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, forwardRef, useRef } from 'react';

import { useComposedRefs } from '@dxos/react-hooks';
import {
  Button,
  Container,
  DIALOG_AUTOFOCUS_ATTRIBUTE,
  Field,
  Group,
  type Gutter,
  Panel,
  type PanelRootProps,
  ScrollArea,
  SystemButton,
  composable,
  useDefaultGutter,
  useTranslation,
} from '@dxos/react-ui';

import { translationKey } from '#translations';

import { useFormContext, useKeyHandler } from '../hooks/index.ts';
import { FormField } from './FormField.tsx';
import { FormFields } from './FormFieldDispatch.tsx';
import { FormFieldSet } from './FormFieldSet.tsx';
import { FormLayoutController } from './FormLayout.tsx';
import { FormRoot, type FormRootProps } from './FormRoot.tsx';

/** The settings variant's two tracks (AUDIT §3.2 option 1): label and description, then the control. */
export const SETTINGS_COLUMNS = 'minmax(0, 1fr) [control] minmax(0, 1fr)';

//
// Viewport
//

export type FormViewportProps = PropsWithChildren<{
  /**
   * Fill the parent and scroll: the form becomes its own pane (a `Panel` whose Body is a ScrollArea around the
   * gutter Container), so it is sized, collapses its rails against its own width and hosts the scrollbar in its end
   * rail. A form already inside a scrolling gutter Container needs no Viewport.
   */
  scroll?: boolean;
  /** The pane's size when `scroll`; otherwise the form inherits its host's. */
  size?: PanelRootProps['size'];
  /** The form keeps the reading width (`document`, the default), centred in a wider host; `full` spans the host. */
  width?: 'document' | 'full';
  gutter?: Gutter;
}>;

/**
 * The gutter Container that owns the form's rails; with `scroll`, the Body of a pane of its own. Composable, so a
 * form component can be the `asChild` child of a host that merges its layout props and ref onto it. The gutter defaults
 * to the enclosing panel's (`sm`, the form inset), else `sm`.
 */
export const FormViewport = composable<HTMLDivElement, FormViewportProps>(
  ({ children, scroll, size, width = 'document', gutter, ...props }, forwardedRef) => {
    const defaultGutter = useDefaultGutter();
    const documentWidth = width === 'document' ? width : undefined;
    return scroll ? (
      <Panel.Root
        {...props}
        size={size}
        width={documentWidth}
        gutter={gutter === 'inherit' ? undefined : gutter}
        ref={forwardedRef}
      >
        <Panel.Body asChild>
          <ScrollArea.Root>
            <ScrollArea.Viewport asChild>
              {/* The block inset keeps the last section off the pane's bottom edge when scrolled to the end. */}
              <Container padBlock>{children}</Container>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Panel.Root>
    ) : (
      <Container {...props} gutter={gutter ?? defaultGutter ?? 'sm'} width={documentWidth} ref={forwardedRef}>
        {children}
      </Container>
    );
  },
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
  const settings = variant === 'settings';
  // A settings form is a reading-width column of its own tracks (the current Form's `dx-document` settings content).
  return (
    <Container
      role='form'
      gutter={settings ? 'none' : 'inherit'}
      width={settings ? 'document' : undefined}
      gap={settings ? 'lg' : 'sm'}
      columns={settings ? SETTINGS_COLUMNS : undefined}
      data-testid={testId}
      ref={ref}
    >
      {children}
    </Container>
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
    <Group justify='end'>
      {onCancel && (
        <SystemButton.Cancel
          iconOnly={false}
          label={t('cancel-button.label')}
          onClick={onCancel}
          data-testid='cancel-button'
          // Inside a dialog this claims the initial focus, so a reflexive Enter dismisses rather than commits.
          {...{ [DIALOG_AUTOFOCUS_ATTRIBUTE]: '' }}
        />
      )}
      {onSave && (
        <SystemButton.Save
          iconOnly={false}
          type='submit'
          label={submitLabel ?? t('save-button.label')}
          disabled={!canSave || submitDisabled}
          onClick={() => onSave()}
          data-testid='save-button'
        />
      )}
    </Group>
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
    'type': 'submit',
    'label': label ?? t('save-button.label'),
    'disabled': disabled ?? !canSave,
    'onClick': () => onSave(),
    'data-testid': 'save-button',
  } as const;

  return (
    <Group fill>
      {icon || busy ? (
        <Button {...buttonProps} variant='primary' icon={icon ?? 'ph--check--regular'} spin={busy} />
      ) : (
        <SystemButton.Save {...buttonProps} iconOnly={false} />
      )}
    </Group>
  );
};

FormSubmit.displayName = 'Form.Submit';

//
// ErrorText
//

export const FormErrorText = ({ children }: PropsWithChildren) =>
  children ? (
    <Field.Root invalid>
      <Field.ErrorText data-testid='form.error'>{children}</Field.ErrorText>
    </Field.Root>
  ) : null;

FormErrorText.displayName = 'Form.ErrorText';

/** The `Form` namespace of `@dxos/react-ui-form`, rendered with the `Next` namespace of `@dxos/react-ui`; `Root` is the shared one. */
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
