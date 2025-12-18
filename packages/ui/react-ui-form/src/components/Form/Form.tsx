//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import React, { type PropsWithChildren, useEffect, useMemo, useRef } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { createJsonPath, getValue as getValue$, setValue as setValue$ } from '@dxos/effect';
import { IconButton, type IconButtonProps, ScrollArea, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

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
// [ ] Don't call save/autoSave if value hasn't changed
// [ ] Fix onCancel (restore values)
// [ ] Fix useSchema Type.Obj.Any cast
// [ ] Remove @dxos/echo-db deps
// [ ] TableCellEditor (handleEnter/ModalController).
// [ ] Use FormFieldWrapper uniformly
// [ ] Inline tables for object arrays
// [ ] Defer query until popover
// [ ] Omit id from sub properties.
// [x] Refs
//   [x] Single-select (fix popover)
//   [x] Multi-select (array)
// [ ] auto save doesn't work for combobox + select due to only firing on blur (workaround is to use onValuesChanged)

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
} & Pick<NaturalFormFieldSetProps<T>, 'readonly' | 'layout' | 'fieldMap' | 'fieldProvider'>;

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
} = (componentName: string, path: (string | number)[] = [], defaultValue?: () => any) => {
  const jsonPath = createJsonPath(path);
  const {
    form: { values },
  } = useFormContext(componentName);

  const value = getValue$(values, jsonPath);

  useEffect(() => {
    if (!value && defaultValue) {
      setValue$(values, jsonPath, defaultValue());
    }
  }, [value, defaultValue]);

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

type FormViewportProps = ThemedClassName<PropsWithChildren<{}>>;

const FormViewport = ({ classNames, children }: FormViewportProps) => {
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport classNames={['plb-cardSpacingBlock', classNames]}>{children}</ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};

FormViewport.displayName = 'Form.Viewport';

//
// Content
//

type FormContentProps = ThemedClassName<PropsWithChildren<{}>>;

// TOOD(burdon): Figure out nesting (indent and testId).
const FormContent = ({ classNames, children }: FormContentProps) => {
  const { form, testId } = useFormContext(FormContent.displayName);
  const ref = useRef<HTMLDivElement>(null);
  useKeyHandler(ref.current, form);

  return (
    <div
      ref={ref}
      role='form'
      className={mx('flex flex-col is-full pli-cardSpacingInline density-fine', classNames)}
      data-testid={testId}
    >
      {children}
    </div>
  );
};

FormContent.displayName = 'Form.Content';

//
// FieldSet
//

type FormFieldSetProps = ThemedClassName<{}>;

const FormFieldSet = ({ classNames }: FormFieldSetProps) => {
  const { form, ...props } = useFormContext(FormFieldSet.displayName);

  return <NaturalFormFieldSet classNames={classNames} schema={form.schema} {...props} />;
};

FormFieldSet.displayName = 'Form.FieldSet';

//
// Actions
//

type FormActionsProps = ThemedClassName<{}>;

const FormActions = ({ classNames }: FormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const {
    form: { canSave, onSave, onCancel },
    readonly,
    layout,
  } = useFormContext(FormActions.displayName);

  if (readonly || layout === 'static') {
    return null;
  }

  // TODO(burdon): Currently onCancel is a no-op; implement "revert values".
  //   Deprecate FormSubmit ans use FormActions without Cancel button if no callback is supplied.

  return (
    <div role='none' className={mx('grid grid-flow-col auto-cols-fr gap-2 pbs-cardSpacingBlock', classNames)}>
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

FormActions.displayName = 'Form.Actions';

//
// Submit
//

type FormSubmitProps = ThemedClassName<Partial<Pick<IconButtonProps, 'icon' | 'label'>>>;

const FormSubmit = ({ classNames, label, icon }: FormSubmitProps) => {
  const { t } = useTranslation(translationKey);
  const {
    form: { canSave, onSave },
    readonly,
    layout,
  } = useFormContext(FormSubmit.displayName);

  if (readonly || layout === 'static') {
    return null;
  }

  return (
    <div role='none' className={mx('flex is-full pbs-cardSpacingBlock', classNames)}>
      <IconButton
        classNames='is-full'
        type='submit'
        variant='primary'
        disabled={!canSave}
        icon={icon ?? 'ph--check--regular'}
        label={label ?? t('save button label')}
        onClick={onSave}
        data-testid='save-button'
      />
    </div>
  );
};

FormSubmit.displayName = 'Form.Submit';

//
// Form
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Form = {
  Root: FormRoot,
  Viewport: FormViewport,
  Content: FormContent,
  FieldSet: FormFieldSet,
  Actions: FormActions,
  Submit: FormSubmit,
  Label: FormFieldLabel,
};

export { useFormContext, useFormValues, useFormFieldState };

export type {
  FormRootProps,
  FormViewportProps,
  FormContentProps,
  FormFieldSetProps,
  FormActionsProps,
  FormFieldLabelProps as LabelProps,
};
