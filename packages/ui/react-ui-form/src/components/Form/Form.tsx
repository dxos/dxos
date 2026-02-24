//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { type PropsWithChildren, useEffect, useMemo, useRef } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { createJsonPath, getValue as getValue$ } from '@dxos/effect';
import { IconButton, type IconButtonProps, ScrollArea, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import {
  type FormHandler,
  type FormHandlerProps,
  type FormUpdateMeta,
  useFormHandler,
  useKeyHandler,
} from '../../hooks';
import { translationKey } from '../../translations';

import { FormFieldLabel, type FormFieldLabelProps, type FormFieldStateProps } from './FormFieldComponent';
import {
  FormFieldSet as NaturalFormFieldSet,
  type FormFieldSetProps as NaturalFormFieldSetProps,
} from './FormFieldSet';

// New features/polish
// [x] Unify readonly/inline modes
// [ ] auto save doesn't work for combobox + select due to only firing on blur (workaround is to use onValuesChanged)
// [ ] Don't call save/autoSave if value hasn't changed
// [ ] Fix onCancel (restore values)
// [ ] Fix useSchema Type.Obj.Any cast
// [ ] TableCellEditor (handleEnter/ModalController).
// [ ] Use FormFieldWrapper uniformly
// [ ] Inline tables for object arrays
// [ ] Defer query until popover
// [ ] Omit id from sub properties.
// [x] Refs
//   [x] Single-select (fix popover)
//   [x] Multi-select (array)

// TODO(burdon): Move to @dxos/schema (re-export here).
export type ExcludeId<S extends Schema.Schema.AnyNoContext> = Omit<Schema.Schema.Type<S>, 'id'>;

// TODO(burdon): Move to @dxos/schema (re-export here).
export const omitId = <S extends Schema.Schema.AnyNoContext>(schema: S): Schema.Schema<ExcludeId<S>, ExcludeId<S>> =>
  schema.pipe(Schema.omit('id')) as any;

//
// Context
//

type FormContextValue<T extends AnyProperties = any> = {
  /**
   * Form handler.
   */
  form: FormHandler<T>;

  /**
   * Show debug info.
   */
  debug?: boolean;

  /**
   * Testing.
   */
  testId?: string;
} & Pick<NaturalFormFieldSetProps<T>, 'readonly' | 'layout' | 'fieldMap' | 'fieldProvider' | 'projection'>;

const [FormContextProvider, useFormContext] = createContext<FormContextValue>('Form');

/**
 * Get the current form values.
 */
const useFormValues: {
  <T extends AnyProperties>(componentName: string, path?: (string | number)[]): T;
  <T extends AnyProperties>(
    componentName: string,
    path: (string | number)[] | undefined,
    defaultValue: () => T,
  ): T | undefined;
} = (componentName: string, path?: (string | number)[], defaultValue?: () => any) => {
  const stablePath = useMemo(() => path ?? [], [path ? path.join('.') : undefined]);
  const jsonPath = createJsonPath(stablePath);
  const {
    form: { values, onValueChange },
  } = useFormContext(componentName);

  const value = getValue$(values, jsonPath);

  // Apply default value once when the field has no value. lastAppliedPathRef prevents
  // re-applying on every render (e.g. when defaultValue() returns null) and ensures
  // we apply per path when the hook is used for different fields.
  const lastAppliedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (value == null && defaultValue && lastAppliedPathRef.current !== jsonPath) {
      lastAppliedPathRef.current = jsonPath;
      onValueChange(stablePath, SchemaAST.stringKeyword, defaultValue());
    }
  }, [value, defaultValue, onValueChange, stablePath, jsonPath]);

  return value;
};

/**
 * Get the state props for the given field.
 */
const useFormFieldState = (componentName: string, path: (string | number)[] = []): FormFieldStateProps => {
  const stablePath = useMemo(() => path, [Array.isArray(path) ? path.join('.') : path]);
  const {
    form: { getStatus, getValue, onBlur, onValueChange },
  } = useFormContext(componentName);

  return useMemo(
    () => ({
      getStatus: () => getStatus(stablePath),
      getValue: () => getValue(stablePath),
      onBlur: () => onBlur(stablePath),
      onValueChange: (ast: SchemaAST.AST, value: any) => onValueChange(stablePath, ast, value),
    }),
    [getStatus, getValue, onBlur, onValueChange, stablePath],
  );
};

//
// Root
//

type FormRootProps<T extends AnyProperties = AnyProperties> = PropsWithChildren<
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

const FormRoot = <T extends AnyProperties = AnyProperties>({
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

type FormViewportProps = PropsWithChildren<{}>;

// TODO(burdon): Ref and props (allow asChild).
const FormViewport = ({ children }: FormViewportProps) => {
  return (
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

FormViewport.displayName = FORM_VIEWPORT_NAME;

//
// Content
//

const FORM_CONTENT_NAME = 'Form.Content';

type FormContentProps = ThemedClassName<PropsWithChildren<{}>>;

// TOOD(burdon): Figure out nesting (indent and testId).
const FormContent = ({ classNames, children }: FormContentProps) => {
  const { form, testId } = useFormContext(FORM_CONTENT_NAME);
  const ref = useRef<HTMLDivElement>(null);
  useKeyHandler(ref.current, form);

  return (
    <div
      ref={ref}
      role='form'
      className={mx('w-full flex flex-col gap-card-padding px-card-padding', classNames)}
      data-testid={testId}
    >
      {children}
    </div>
  );
};

FormContent.displayName = FORM_CONTENT_NAME;

//
// FieldSet
//

const FORM_FIELDSET_NAME = 'Form.FieldSet';

type FormFieldSetProps = ThemedClassName<{}>;

const FormFieldSet = ({ classNames }: FormFieldSetProps) => {
  const { form, ...props } = useFormContext(FORM_FIELDSET_NAME);

  return <NaturalFormFieldSet classNames={classNames} schema={form.schema} {...props} />;
};

FormFieldSet.displayName = FORM_FIELDSET_NAME;

//
// Actions
//

const FORM_ACTIONS_NAME = 'Form.Actions';

type FormActionsProps = ThemedClassName<{}>;

const FormActions = ({ classNames }: FormActionsProps) => {
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
    <div role='none' className={mx('grid grid-flow-col gap-2 auto-cols-fr py-card-padding', classNames)}>
      {onCancel && (
        <IconButton
          icon='ph--x--regular'
          iconEnd
          label={t('cancel button label')}
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
          label={t('save button label')}
          onClick={onSave}
          data-testid='save-button'
        />
      )}
    </div>
  );
};

FormActions.displayName = FORM_ACTIONS_NAME;

//
// Submit
//

const FORM_SUBMIT_NAME = 'Form.Submit';

type FormSubmitProps = ThemedClassName<Partial<Pick<IconButtonProps, 'icon' | 'label' | 'disabled'>>>;

const FormSubmit = ({ classNames, label, icon, disabled }: FormSubmitProps) => {
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
    <div role='none' className={mx('flex w-full pt-formSpacing', classNames)}>
      <IconButton
        classNames='w-full'
        type='submit'
        variant='primary'
        disabled={disabled ?? !canSave}
        icon={icon ?? 'ph--check--regular'}
        label={label ?? t('save button label')}
        onClick={onSave}
        data-testid='save-button'
      />
    </div>
  );
};

FormSubmit.displayName = FORM_SUBMIT_NAME;

//
// Form
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Form = {
  Root: FormRoot,
  Viewport: FormViewport,
  Content: FormContent,
  FieldSet: FormFieldSet,
  Label: FormFieldLabel,
  Actions: FormActions,
  Submit: FormSubmit,
};

export { useFormContext, useFormValues, useFormFieldState };

export type {
  FormRootProps,
  FormViewportProps,
  FormContentProps,
  FormFieldSetProps,
  FormFieldLabelProps as LabelProps,
  FormActionsProps,
  FormSubmitProps,
};
