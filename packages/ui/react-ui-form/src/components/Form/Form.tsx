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
import { FormFieldSet, type FormFieldSetProps } from './FormFieldSet';

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

type NewFormContextValue<T extends AnyProperties = any> = {
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
} & Pick<FormFieldSetProps<T>, 'readonly' | 'layout' | 'fieldMap' | 'fieldProvider'>;

const [NewFormContextProvider, useNewFormContext] = createContext<NewFormContextValue>('Form');

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
  } = useNewFormContext(componentName);

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
  } = useNewFormContext(componentName);

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

type NewFormRootProps<T extends AnyProperties = AnyProperties> = PropsWithChildren<
  {
    /**
     * Called when the form is submitted and passes validation.
     */
    onSave?: (values: T, meta: FormUpdateMeta<T>) => void;

    /**
     * Called when the form is canceled to abandon/undo any pending changes.
     */
    onCancel?: () => void;
  } & Omit<NewFormContextValue<T>, 'form'> &
    Pick<FormHandlerProps<T>, 'schema' | 'autoSave' | 'values' | 'defaultValues' | 'onValidate' | 'onValuesChanged'> &
    Omit<FormFieldSetProps<T>, 'schema' | 'path'>
>;

const NewFormRoot = <T extends AnyProperties = AnyProperties>({
  children,
  schema,
  values,
  onSave,
  onCancel,
  ...props
}: NewFormRootProps<T>) => {
  const form = useFormHandler({ schema, values, onSave, onCancel, ...props });

  return (
    <NewFormContextProvider form={form} {...props}>
      {children}
    </NewFormContextProvider>
  );
};

NewFormRoot.displayName = 'Form.Root';

//
// Viewport
//

type NewFormViewportProps = ThemedClassName<PropsWithChildren<{}>>;

const NewFormViewport = ({ classNames, children }: NewFormViewportProps) => {
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport classNames={['plb-cardSpacingBlock', classNames]}>{children}</ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};

NewFormViewport.displayName = 'Form.Viewport';

//
// Content
//

type NewFormContentProps = ThemedClassName<PropsWithChildren<{}>>;

// TOOD(burdon): Figure out nesting (indent and testId).
const NewFormContent = ({ classNames, children }: NewFormContentProps) => {
  const { form, testId } = useNewFormContext(NewFormContent.displayName);
  const ref = useRef<HTMLDivElement>(null);
  useKeyHandler(ref.current, form);

  return (
    <div
      ref={ref}
      role='form'
      className={mx('flex flex-col is-full pli-cardSpacingInline', classNames)}
      data-testid={testId}
    >
      {children}
    </div>
  );
};

NewFormContent.displayName = 'Form.Content';

//
// FieldSet
//

type NewFormFieldSetProps = ThemedClassName<{}>;

const NewFormFieldSet = ({ classNames }: NewFormFieldSetProps) => {
  const { form, ...props } = useNewFormContext(NewFormFieldSet.displayName);

  return <FormFieldSet classNames={classNames} schema={form.schema} {...props} />;
};

NewFormFieldSet.displayName = 'Form.FieldSet';

//
// Actions
//

type NewFormActionsProps = ThemedClassName<{}>;

const NewFormActions = ({ classNames }: NewFormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const {
    form: { isValid, onSave, onCancel },
    readonly,
    layout,
  } = useNewFormContext(NewFormActions.displayName);

  if (readonly || layout === 'static') {
    return null;
  }

  // TODO(burdon): Currently onCancel is a no-op; implement "revert values".
  //   Deprecate NewFormSubmit ans use NewFormActions without Cancel button if no callback is supplied.

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
          disabled={!isValid}
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

NewFormActions.displayName = 'Form.Actions';

//
// Submit
//

type NewFormSubmitProps = ThemedClassName<Partial<Pick<IconButtonProps, 'icon' | 'label'>>>;

const NewFormSubmit = ({ classNames, label, icon }: NewFormSubmitProps) => {
  const { t } = useTranslation(translationKey);
  const {
    form: { isValid, onSave },
    readonly,
    layout,
  } = useNewFormContext(NewFormSubmit.displayName);

  if (readonly || layout === 'static') {
    return null;
  }

  return (
    <div role='none' className={mx('flex is-full pbs-cardSpacingBlock', classNames)}>
      <IconButton
        classNames='is-full'
        type='submit'
        variant='primary'
        disabled={!isValid}
        icon={icon ?? 'ph--check--regular'}
        label={label ?? t('save button label')}
        onClick={onSave}
        data-testid='save-button'
      />
    </div>
  );
};

NewFormSubmit.displayName = 'Form.Submit';

//
// Form
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Form = {
  Root: NewFormRoot,
  Viewport: NewFormViewport,
  Content: NewFormContent,
  FieldSet: NewFormFieldSet,
  Actions: NewFormActions,
  Submit: NewFormSubmit,
  Label: FormFieldLabel,
};

export { useNewFormContext, useFormValues, useFormFieldState };

export type {
  NewFormRootProps,
  NewFormViewportProps,
  NewFormContentProps,
  NewFormFieldSetProps,
  NewFormActionsProps,
  FormFieldLabelProps as LabelProps,
};
