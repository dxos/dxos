//
// Copyright 2024 DXOS.org
//

import { format as formatDate } from 'date-fns';
import * as Option from 'effect/Option';
import * as Str from 'effect/String';
import React, { Component, type PropsWithChildren, type ReactNode, type Ref, useMemo } from 'react';

import { Format } from '@dxos/echo';
import { SchemaAST, SchemaEx } from '@dxos/effect';
import { Field, Icon, type ThemedClassName, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type FormFieldLabelPlacement, type FormFieldRendererProps, type FormPresentation } from '#types';

import { useFormContext, useFormFieldState } from '../../../hooks/index.ts';
import { type FormVariant, formTheme } from '../Form.theme';
import { resolveLayoutField } from '../FormLayout/resolve-layout-field.ts';
import { type FormFieldBinding, FormFieldBindingProvider } from './FormFieldContext.ts';
import { FormFieldDispatch } from './FormFieldDispatch.tsx';
import { presentationFor } from './presentation.tsx';

//
// FormFieldLabel
//

export type FormFieldLabelProps = ThemedClassName<
  {
    /** Render a plain `<span>` instead of an input-associated `Field.Label`, for labels used outside an `Field.Root` (e.g. section/group headers). */
    standalone?: boolean;
    /** Class applied to the inner label text node, overriding the default size/color (e.g. `text-lg`). */
    labelClassName?: string;
    /** An id on the label text, for what names itself by it (a group, its disclosure). */
    id?: string;
    /** Form variant; selects the label's chrome (e.g. `settings` enlarges the text and places it in the field grid). */
    variant?: FormVariant;
    error?: string;
    /**
     * JSON path of the field this label describes (e.g. `runtime.client.storage.persistent`).
     * Field metadata; accepted by callers but not currently rendered.
     */
    path?: string;
    /**
     * Trailing button rendered at the end of the label row (last grid column).
     * Used by nested-object field sets to surface a collapse toggle.
     */
    button?: ReactNode;
    /**
     * Read-only content rendered right after the label text (e.g. a live numeric readout for a
     * slider field) — a sibling of `Field.Label`, never a child, so the label's `textContent`
     * stays exactly `label` (see the comment on `labelClassNames` below) and doesn't masquerade
     * as an interactive control the way `button` does.
     */
    labelEnd?: ReactNode;
  } & Pick<FormFieldRendererProps, 'label' | 'readonly' | 'required'>
>;

export const FormFieldLabel = ({
  classNames,
  labelClassName,
  id,
  variant = 'default',
  label,
  error,
  readonly,
  required,
  standalone,
  button,
  labelEnd,
}: FormFieldLabelProps) => {
  const styles = formTheme.styles({ variant });
  // Render the required asterisk via a `::after` pseudo-element rather than a DOM node: it keeps the
  // label's `textContent` exactly `label`, so fields stay locatable by their exact label text
  // (`getByLabelText('Name')`), which the DOM-text-based query would otherwise miss as `Name *`.
  // The `fieldLabelText` slot is applied last so a variant/caller size/color (e.g. `text-lg`) wins over
  // The control-height row comes from `Field.Label` itself; the read-only/standalone `span` is not
  // one, so it repeats the geometry to keep the row the same height either way.
  const labelClassNames = mx(
    'flex items-center min-h-(--dx-control)',
    required && "after:content-['*'] after:ms-0.5 after:text-warning-text",
    styles.fieldLabelText({ class: labelClassName }),
  );

  // `Field.Label` is a themed primitive that reads `classNames` (and ignores `className`), whereas the
  // plain `span` used for read-only/standalone labels reads `className`.
  const labelNode =
    readonly || standalone ? (
      <span id={id} className={labelClassNames}>
        {label}
      </span>
    ) : (
      <Field.Label id={id} classNames={labelClassNames}>
        {label}
      </Field.Label>
    );

  const content = (
    <>
      {labelNode}
      {labelEnd}
      {error ? (
        <Tooltip.Trigger asChild content={error} side='bottom'>
          <Icon icon='ph--warning--regular' size={4} classNames='text-error-text' />
        </Tooltip.Trigger>
      ) : (
        <span />
      )}
      {button}
    </>
  );

  return <div className={styles.fieldLabel({ class: mx(classNames) })}>{content}</div>;
};

FormFieldLabel.displayName = 'Form.FieldLabel';

//
// FormField
//

/**
 * Formats a value for `static` (read-only, plain-DOM) presentation based on its
 * type `format`. Dates/times are rendered human-readable; everything else falls
 * back to `String(value)`.
 */
const formatStaticValue = (value: unknown, format?: Format.TypeFormat): string => {
  if (value == null) {
    return '';
  }

  switch (format) {
    case Format.TypeFormat.DateTime:
    case Format.TypeFormat.Date:
    case Format.TypeFormat.Time: {
      const date = new Date(value as string);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }
      const pattern = format === Format.TypeFormat.DateTime ? 'PPp' : format === Format.TypeFormat.Date ? 'PP' : 'p';
      return formatDate(date, pattern);
    }
    default:
      return String(value);
  }
};

const FORM_FIELD_NAME = 'Form.Field';

/** A bound value rendered as text: what a `static` presentation shows in place of the control. */
export const FormStaticValue = ({ value, format }: { value: unknown; format?: Format.TypeFormat }) => (
  <p className='truncate min-w-0'>{formatStaticValue(value, format)}</p>
);

export type FormFieldProps<T = any> = ThemedClassName<
  PropsWithChildren<{
    /**
     * Binds the row to the form model at this path, dotted from the root: label, description,
     * value, error, required and readonly come from the schema and the model, and a control inside
     * reads them with `useFormField`. With no children the dispatcher picks the control.
     */
    path?: string;
    /** The row's own label, description and error, when it is not bound. */
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    readonly?: boolean;
    /**
     * The label is text rather than a `<label>`: the row holds no single control (a button, a
     * readout, several inputs), so there is nothing for it to name.
     */
    standalone?: boolean;
    /**
     * Read-only content after the label text (a live readout for a slider) — a sibling of the
     * label, never a child, so the label's text stays exactly `label`.
     */
    labelEnd?: ReactNode;
    /** `beside` lays the label after the control on one line, the shape of a toggle; the theme decides per variant. */
    labelPlacement?: FormFieldLabelPlacement;
    /** Overrides the form's presentation for this row. */
    presentation?: FormPresentation;
    /** Renders a bound value in the `static` presentation; the default formats by the schema's format. */
    renderStatic?: (value: T | undefined) => ReactNode;
    rootRef?: Ref<HTMLDivElement>;
  }>
>;

/**
 * The leaf: a `Field.Root` row of label, description, control and error, always a real field
 * whether the value comes from the form model (`path`) or from the caller (props). Only the binding
 * differs; nothing in how the row renders does.
 */
export const FormField = <T,>({ path, children, ...props }: FormFieldProps<T>) => {
  if (path !== undefined) {
    return children === undefined ? (
      <FormBoundFieldDispatch<T> path={path} {...props} />
    ) : (
      <FormBoundField<T> path={path} {...props}>
        {children}
      </FormBoundField>
    );
  }
  return <FormFieldRow<T> {...props}>{children}</FormFieldRow>;
};

FormField.displayName = FORM_FIELD_NAME;

type FormBoundFieldProps<T> = Omit<FormFieldProps<T>, 'path'> & { path: string };

/** A bound row around a hand-written control: resolves the property and the binding, then renders the row. */
const FormBoundField = <T,>({ path, children, ...props }: FormBoundFieldProps<T>) => {
  const property = useFormSchemaProperty(FORM_FIELD_NAME, path);
  const binding = useFormFieldBindingAt<T>(FORM_FIELD_NAME, path, property, props);
  return (
    <FormFieldRow<T>
      label={props.label ?? property?.label ?? ''}
      description={props.description ?? property?.description}
      format={property?.format}
      {...props}
      binding={binding}
    >
      {children}
    </FormFieldRow>
  );
};

/** A bound row with no control of its own: the dispatcher renders the row and picks the control. */
const FormBoundFieldDispatch = <T,>({ path, ...props }: FormBoundFieldProps<T>) => {
  const { form: _form, variant: _variant, testId: _testId, ...context } = useFormContext(FORM_FIELD_NAME);
  const property = useFormSchemaProperty(FORM_FIELD_NAME, path);
  if (!property) {
    return null;
  }
  const segments = SchemaEx.isJsonPath(path) ? SchemaEx.splitJsonPath(path) : [];
  return (
    <FormFieldDispatch
      {...context}
      type={property.type}
      name={String(segments[segments.length - 1])}
      label={props.label}
      path={segments}
      required={props.required ?? property.required}
      readonly={props.readonly ?? context.readonly}
      layout={props.presentation ?? context.layout}
    />
  );
};

/** The schema property at a path of the form's schema: its type, and what the row derives from it. */
export const useFormSchemaProperty = (componentName: string, path: string) => {
  const { form } = useFormContext(componentName);
  return useMemo(() => {
    if (!form.schema) {
      return undefined;
    }
    const resolved = resolveLayoutField(form.schema, path);
    if (!resolved) {
      return undefined;
    }
    const description = SchemaEx.getAnnotation<string>(SchemaAST.DescriptionAnnotationId)(resolved.type);
    const format = Format.FormatAnnotation.getFromAst(resolved.type).pipe(Option.getOrUndefined);
    return {
      type: resolved.type,
      label: resolved.title ?? Str.capitalize(resolved.leafName),
      description,
      format,
      required: resolved.required,
    };
  }, [form.schema, path]);
};

type SchemaProperty = ReturnType<typeof useFormSchemaProperty>;

/** The binding for a row at a path, from the form handler. */
const useFormFieldBindingAt = <T,>(
  componentName: string,
  path: string,
  property: SchemaProperty,
  { required, readonly, presentation }: Pick<FormFieldProps<T>, 'required' | 'readonly' | 'presentation'>,
): FormFieldBinding<T> => {
  const { readonly: formReadonly, layout } = useFormContext(componentName);
  const segments = useMemo(() => (SchemaEx.isJsonPath(path) ? SchemaEx.splitJsonPath(path) : []), [path]);
  const { getStatus, getValue, onBlur, onValueChange } = useFormFieldState(componentName, segments);
  const { status, error } = getStatus();
  const value = getValue() as T | undefined;
  const type = property?.type ?? SchemaAST.unknownKeyword;
  return useMemo(
    () => ({
      path,
      type,
      value,
      setValue: (next: T | undefined) => onValueChange(type, next),
      onBlur,
      status,
      error,
      required: required ?? property?.required,
      readonly: readonly ?? formReadonly,
      presentation: presentation ?? layout,
    }),
    [
      path,
      type,
      value,
      onValueChange,
      onBlur,
      status,
      error,
      required,
      property?.required,
      readonly,
      formReadonly,
      presentation,
      layout,
    ],
  );
};

export type FormFieldRowProps<T = any> = Omit<FormFieldProps<T>, 'path'> & {
  /** The schema format of a bound value, for its static rendering. */
  format?: Format.TypeFormat;
  /** Present when the row is bound; the control inside reads it with `useFormField`. */
  binding?: FormFieldBinding<T>;
};

/**
 * The row itself, shared by every route into a field: label row (label, `labelEnd`, error icon),
 * description, control, error text, inside a `Field.Root` that carries the validation valence.
 */
export const FormFieldRow = <T,>({
  classNames,
  children,
  label,
  description,
  error: errorProp,
  required: requiredProp,
  readonly: readonlyProp,
  standalone,
  labelEnd,
  labelPlacement = 'above',
  presentation: presentationProp,
  renderStatic,
  format,
  binding,
  rootRef,
}: FormFieldRowProps<T>) => {
  const { variant = 'default', layout } = useFormContext(FORM_FIELD_NAME);
  const styles = formTheme.styles({ variant, labelPlacement });
  const { showDescription } = formTheme.behavior[variant];
  const resolved = presentationFor(presentationProp ?? binding?.presentation ?? layout);
  const error = binding?.error ?? errorProp;
  const readonly = binding?.readonly ?? readonlyProp;
  // The asterisk marks what is still outstanding, so a bound row clears it once it holds a value.
  const required = binding ? binding.required && isEmptyValue(binding.value) : requiredProp;

  let control: ReactNode = children;
  if (binding && resolved.isStatic) {
    if (binding.value == null) {
      return null;
    }
    control = renderStatic?.(binding.value) ?? <FormStaticValue value={binding.value} format={format} />;
  }

  const row = (
    <Field.Root
      validationValence={binding?.status ?? (error ? 'error' : undefined)}
      required={!!required}
      readOnly={readonly}
    >
      <div className={styles.field({ class: mx(classNames) })} ref={rootRef}>
        {/* A label beside its control follows it in the DOM, as a toggle's text does; the settings grid places by area either way. */}
        {labelPlacement === 'beside' && <div className={styles.fieldControl()}>{control}</div>}
        {resolved.showLabel && label && (
          <FormFieldLabel
            variant={variant}
            error={error}
            readonly={readonly}
            required={required}
            standalone={standalone}
            labelEnd={labelEnd}
            label={label}
          />
        )}
        {showDescription && description && (
          <Field.HelperText classNames={styles.fieldDescription()}>{description}</Field.HelperText>
        )}
        {labelPlacement !== 'beside' && <div className={styles.fieldControl()}>{control}</div>}
        {resolved.showError && error && (
          <div className={styles.fieldValidation()}>
            <Field.ErrorText>{error}</Field.ErrorText>
          </div>
        )}
      </div>
    </Field.Root>
  );

  return binding ? <FormFieldBindingProvider {...binding}>{row}</FormFieldBindingProvider> : row;
};

FormFieldRow.displayName = 'Form.FieldRow';

/** Whether a value counts as unfilled for the required marker. `false` and `0` are values. */
const isEmptyValue = (value: unknown): boolean =>
  value == null || value === '' || (Array.isArray(value) && value.length === 0);

//
// FormFieldErrorBoundary
//

type FormFieldErrorState = {
  error: Error | undefined;
};

type FormFieldErrorBoundaryProps = PropsWithChildren<{
  path?: (string | number)[];
}>;

export class FormFieldErrorBoundary extends Component<FormFieldErrorBoundaryProps, FormFieldErrorState> {
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override state = { error: undefined };

  override componentDidUpdate(prevProps: FormFieldErrorBoundaryProps) {
    if (prevProps.path !== this.props.path) {
      this.resetError();
    }
  }

  override render() {
    if (this.state.error) {
      return (
        <div className='flex gap-2 border border-error-border font-mono text-sm'>
          <span className='bg-error-bg text-base-fg px-1 font-thin'>ERROR</span>
          {String(this.props.path?.join('.'))}
        </div>
      );
    }

    return this.props.children;
  }

  private resetError() {
    this.setState({ error: undefined });
  }
}
