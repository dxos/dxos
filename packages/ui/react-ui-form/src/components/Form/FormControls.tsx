//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useRef } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import {
  Column,
  type ColumnRootProps,
  IconButton,
  type IconButtonProps,
  Input,
  ScrollArea,
  type ThemedClassName,
  composable,
  composableProps,
  useMergeRefs,
  useTranslation,
  withColumn,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import {
  FormContextProvider,
  type FormContextValue,
  type FormHandlerProps,
  type FormUpdateMeta,
  useFormContext,
  useFormHandler,
  useKeyHandler,
} from '../../hooks';
import {
  FormFieldSet as NaturalFormFieldSet,
  type FormFieldSetProps as NaturalFormFieldSetProps,
} from './FormFieldSet';
import { FormLayout as NaturalFormLayout, type FormLayoutProps as NaturalFormLayoutProps } from './FormLayout';

//
// Root
//

export type FormRootProps<T extends AnyProperties = AnyProperties> = PropsWithChildren<
  {
    /**
     * Called when the form is submitted and passes validation.
     */
    onSave?: (values: T, meta: FormUpdateMeta<T>) => void;

    /**
     * Called when the form is canceled to abandon/undo any pending changes.
     */
    onCancel?: () => void;
  } & Omit<FormContextValue<T>, 'form'> &
    Pick<FormHandlerProps<T>, 'schema' | 'autoSave' | 'values' | 'defaultValues' | 'onValidate' | 'onValuesChanged'> &
    Omit<NaturalFormFieldSetProps<T>, 'schema' | 'path'>
>;

export const FormRoot = <T extends AnyProperties = AnyProperties>({
  children,
  schema,
  values,
  onSave,
  onCancel,
  ...props
}: FormRootProps<T>) => {
  const form = useFormHandler({ schema, values, onSave, onCancel, ...props });

  return (
    <FormContextProvider form={form} {...props}>
      {children}
    </FormContextProvider>
  );
};

FormRoot.displayName = 'Form.Root';

//
// Viewport
//

const FORM_VIEWPORT_NAME = 'Form.Viewport';

export type FormViewportProps = { scroll?: boolean; gutter?: ColumnRootProps['gutter'] };

// The viewing window: owns the gutter Column (chrome/side-padding).
// Content-height by default; `scroll` makes it fill its parent and scroll (the gutter then hosts the scrollbar).
export const FormViewport = composable<HTMLDivElement, FormViewportProps>(
  ({ children, scroll, gutter = 'xs', ...props }, forwardedRef) => {
    // Span the full width when nested inside another Column grid (e.g. Card.Root)
    // instead of landing in a single narrow track.
    const span = '[.dx-column-root_&]:col-span-full';
    if (scroll) {
      return (
        <Column.Root gutter={gutter} classNames={['dx-expander', span]}>
          <ScrollArea.Root {...composableProps(props)} orientation='vertical' centered padding thin ref={forwardedRef}>
            <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
          </ScrollArea.Root>
        </Column.Root>
      );
    }

    return (
      <Column.Root {...composableProps(props)} gutter={gutter} classNames={['w-full min-w-0', span]} ref={forwardedRef}>
        {children}
      </Column.Root>
    );
  },
);

FormViewport.displayName = FORM_VIEWPORT_NAME;

//
// Content
//

const FORM_CONTENT_NAME = 'Form.Content';

export type FormContentProps = ThemedClassName<PropsWithChildren<{}>>;

// The viewed body: centered in the viewport's gutter. Pure body — the gutter Column is owned by `Form.Viewport`.
export const FormContent = composable<HTMLDivElement, FormContentProps>(({ children, ...props }, forwardedRef) => {
  const { form, testId } = useFormContext(FORM_CONTENT_NAME);
  const localRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergeRefs([forwardedRef, localRef]);
  useKeyHandler(localRef, form);

  return (
    <div
      {...composableProps(props, {
        role: 'form',
        classNames: mx(withColumn.center(), 'flex flex-col w-full'),
      })}
      data-testid={testId}
      ref={mergedRef}
    >
      {children}
    </div>
  );
});

FormContent.displayName = FORM_CONTENT_NAME;

//
// FieldSet
//

const FORM_FIELDSET_NAME = 'Form.FieldSet';

export type FormFieldSetProps = ThemedClassName<NaturalFormFieldSetProps<any>>;

export const FormFieldSet = (props: FormFieldSetProps) => {
  const { form, ...contextProps } = useFormContext(FORM_FIELDSET_NAME);

  return <NaturalFormFieldSet schema={form.schema} {...contextProps} {...props} />;
};

FormFieldSet.displayName = FORM_FIELDSET_NAME;

//
// Layout
//

const FORM_LAYOUT_NAME = 'Form.Layout';

export type FormLayoutProps = Omit<NaturalFormLayoutProps, 'schema'> & { schema?: NaturalFormLayoutProps['schema'] };

export const FormLayout = ({ schema, ...props }: FormLayoutProps) => {
  const { form, ...contextProps } = useFormContext(FORM_LAYOUT_NAME);
  const resolvedSchema = schema ?? form.schema;
  if (!resolvedSchema) {
    return null;
  }

  return <NaturalFormLayout schema={resolvedSchema} {...contextProps} {...props} />;
};

FormLayout.displayName = FORM_LAYOUT_NAME;

//
// Actions
//

const FORM_ACTIONS_NAME = 'Form.Actions';

export type FormActionsProps = ThemedClassName<{}>;

export const FormActions = ({ classNames }: FormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const {
    form: { canSave, onSave, onCancel },
    readonly,
    layout,
  } = useFormContext(FORM_ACTIONS_NAME);

  if (readonly || layout === 'static') {
    return null;
  }

  // TODO(burdon): Currently onCancel is a no-op; implement "revert values".
  //   Deprecate FormSubmit ans use FormActions without Cancel button if no callback is supplied.

  return (
    <div
      className={mx(withColumn.center(), 'grid grid-flow-col gap-form-gap auto-cols-fr py-form-padding', classNames)}
    >
      {onCancel && (
        <IconButton
          icon='ph--x--regular'
          iconEnd
          label={t('cancel-button.label')}
          onClick={onCancel}
          data-testid='cancel-button'
        />
      )}
      {onSave && (
        <IconButton
          type='submit'
          variant='primary'
          disabled={!canSave}
          icon='ph--check--regular'
          iconEnd
          label={t('save-button.label')}
          onClick={onSave}
          data-testid='save-button'
        />
      )}
    </div>
  );
};

FormActions.displayName = FORM_ACTIONS_NAME;

//
// Section
//

const FORM_SECTION_NAME = 'Form.Section';

export type FormSectionProps = ThemedClassName<{ label?: string; description?: string }>;

export const FormSection = composable<HTMLDivElement, FormSectionProps>(
  ({ children, label, description, ...props }, forwardedRef) => {
    return (
      <div
        {...composableProps(props, { classNames: 'flex flex-col pt-form-section-gap first:pt-0' })}
        ref={forwardedRef}
      >
        {label && <h2 className='text-lg'>{label}</h2>}
        {description && <p className='text-description'>{description}</p>}
        {children}
      </div>
    );
  },
);

FormSection.displayName = FORM_SECTION_NAME;

//
// Submit
//

const FORM_SUBMIT_NAME = 'Form.Submit';

export type FormSubmitProps = ThemedClassName<Partial<Pick<IconButtonProps, 'icon' | 'label' | 'disabled'>>>;

export const FormSubmit = ({ classNames, label, icon, disabled }: FormSubmitProps) => {
  const { t } = useTranslation(translationKey);
  const {
    form: { canSave, onSave },
    readonly,
    layout,
  } = useFormContext(FORM_SUBMIT_NAME);

  if (readonly || layout === 'static') {
    return null;
  }

  return (
    <div className={mx('flex w-full pt-form-padding', classNames)}>
      <IconButton
        classNames='w-full'
        type='submit'
        variant='primary'
        disabled={disabled ?? !canSave}
        icon={icon ?? 'ph--check--regular'}
        label={label ?? t('save-button.label')}
        onClick={onSave}
        data-testid='save-button'
      />
    </div>
  );
};

FormSubmit.displayName = FORM_SUBMIT_NAME;

//
// Error
//

const FORM_ERROR_NAME = 'Form.Error';

export type FormErrorProps = ThemedClassName<PropsWithChildren>;

/** Form-level error/validation message (e.g. a failed submit), styled via the error valence. */
export const FormError = ({ children, classNames }: FormErrorProps) => {
  if (!children) {
    return null;
  }

  return (
    <Input.Root validationValence='error'>
      <Input.Validation classNames={classNames}>{children}</Input.Validation>
    </Input.Root>
  );
};

FormError.displayName = FORM_ERROR_NAME;
