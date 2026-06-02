//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { type PropsWithChildren, useEffect, useMemo, useRef } from 'react';

import { Annotation as EchoAnnotation, Type } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { createJsonPath, getValue as getValue$ } from '@dxos/effect';
import {
  Column,
  type ColumnRootProps,
  IconButton,
  type IconButtonProps,
  Input,
  ScrollArea,
  type ThemedClassName,
  useMergeRefs,
  useTranslation,
} from '@dxos/react-ui';
import { composable, composableProps, withColumn } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import {
  type FormHandler,
  type FormHandlerProps,
  type FormUpdateMeta,
  useFormHandler,
  useKeyHandler,
} from '../../hooks';
import { FormFieldLabel, type FormFieldLabelProps, type FormFieldStateProps } from './FormFieldComponent';
import {
  FormFieldSet as NaturalFormFieldSet,
  type FormFieldSetProps as NaturalFormFieldSetProps,
} from './FormFieldSet';
import { FormTooltipsContext } from './FormTooltipsContext';
import { FormLayout as NaturalFormLayout } from './Layout';
import { type FormLayoutProps as NaturalFormLayoutProps } from './Layout/FormLayout';

// TODO(burdon): Move styles to form.ts (as with ui-theme).

// TODO(burdon): Reconcile with @dxos/echo.
export type ExcludeId<S extends Schema.Schema.AnyNoContext | Type.AnyEntity> = Omit<
  S extends Type.AnyEntity
    ? Type.InstanceType<S>
    : S extends Schema.Schema.AnyNoContext
      ? Schema.Schema.Type<S>
      : never,
  'id'
>;

// TODO(burdon): Move to @dxos/schema (re-export here).
export const omitId = <S extends Schema.Schema.AnyNoContext | Type.AnyEntity>(
  schemaOrType: S,
): Schema.Schema<ExcludeId<S>, ExcludeId<S>> => {
  const schema = Type.isType(schemaOrType)
    ? Type.getSchema(schemaOrType)
    : (schemaOrType as Schema.Schema.AnyNoContext);
  return schema.pipe(Schema.omit('id')) as any;
};

/**
 * Drop fields annotated with `FormInputAnnotation.set(false)` from a schema so
 * the form's validator doesn't trip on required-but-hidden fields. Used by
 * the picker's inline create form, where a `FactoryAnnotation` typically
 * supplies the hidden values (e.g. a backing-object Ref) outside the form.
 */
export const omitHiddenFormFields = <S extends Schema.Schema.AnyNoContext>(schema: S): S => {
  const properties = SchemaAST.getPropertySignatures(schema.ast);
  const hidden = properties
    .filter((prop) => Option.getOrElse(EchoAnnotation.FormInputAnnotation.getFromAst(prop.type), () => true) === false)
    .map((prop) => prop.name as string);
  return hidden.length === 0 ? schema : (schema.pipe(Schema.omit(...(hidden as [string, ...string[]]))) as any);
};

//
// Context
//

type FormContextValue<T extends AnyProperties = any> = {
  /**
   * Form handler.
   */
  form: FormHandler<T>;

  /**
   * Show field tooltips (currently: JSON path on each label). Defaults to
   * `true`; pass `false` to suppress.
   */
  tooltips?: boolean;

  /**
   * Testing.
   */
  testId?: string;
} & Pick<
  NaturalFormFieldSetProps<T>,
  'readonly' | 'layout' | 'fieldMap' | 'fieldProvider' | 'projection' | 'createTypename' | 'createFieldMap' | 'db'
>;

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
    <FormTooltipsContext.Provider value={props.tooltips ?? true}>
      <FormContextProvider form={form} {...props}>
        {children}
      </FormContextProvider>
    </FormTooltipsContext.Provider>
  );
};

FormRoot.displayName = 'Form.Root';

//
// Viewport
//

const FORM_VIEWPORT_NAME = 'Form.Viewport';

type FormViewportProps = { scroll?: boolean; gutter?: ColumnRootProps['gutter'] };

// The viewing window: owns the gutter Column (chrome/side-padding). Content-height by default;
// `scroll` makes it fill its parent and scroll (the gutter then hosts the scrollbar).
const FormViewport = composable<HTMLDivElement, FormViewportProps>(
  ({ children, scroll, gutter = 'sm', ...props }, forwardedRef) => {
    // Span the full width when nested inside another Column grid (e.g. Card.Root) instead of
    // landing in a single narrow track.
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

type FormContentProps = ThemedClassName<PropsWithChildren<{}>>;

// The viewed body: centered in the viewport's gutter. Pure body — the gutter Column is owned by `Form.Viewport`.
const FormContent = composable<HTMLDivElement, FormContentProps>(({ children, ...props }, forwardedRef) => {
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

type FormFieldSetProps = ThemedClassName<NaturalFormFieldSetProps<any>>;

const FormFieldSet = (props: FormFieldSetProps) => {
  const { form, ...contextProps } = useFormContext(FORM_FIELDSET_NAME);

  return <NaturalFormFieldSet schema={form.schema} {...contextProps} {...props} />;
};

FormFieldSet.displayName = FORM_FIELDSET_NAME;

//
// Layout
//

const FORM_LAYOUT_NAME = 'Form.Layout';

type FormLayoutProps = Omit<NaturalFormLayoutProps, 'schema'> & { schema?: NaturalFormLayoutProps['schema'] };

const FormLayout = ({ schema, ...props }: FormLayoutProps) => {
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

type FormSectionProps = ThemedClassName<{ label?: string; description?: string }>;

const FormSection = composable<HTMLDivElement, FormSectionProps>(
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

type FormErrorProps = ThemedClassName<PropsWithChildren>;

/** Form-level error/validation message (e.g. a failed submit), styled via the error valence. */
const FormError = ({ children, classNames }: FormErrorProps) => {
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

//
// Form
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Form = {
  Root: FormRoot,
  Viewport: FormViewport,
  Content: FormContent,
  Section: FormSection,
  FieldSet: FormFieldSet,
  Layout: FormLayout,
  Label: FormFieldLabel,
  Actions: FormActions,
  Submit: FormSubmit,
  Error: FormError,
};

export { useFormContext, useFormValues, useFormFieldState };

export type {
  FormRootProps,
  FormViewportProps,
  FormContentProps,
  FormSectionProps,
  FormFieldSetProps,
  FormLayoutProps,
  FormFieldLabelProps,
  FormActionsProps,
  FormSubmitProps,
};
