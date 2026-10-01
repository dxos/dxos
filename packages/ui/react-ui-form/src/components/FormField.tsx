//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { type Format } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { Next } from '@dxos/react-ui';

import { type FormFieldLabelPlacement, type FormPresentation } from '#types';

import { useFormContext } from '../hooks/index.ts';
import { formatStaticValue, isEmptyValue, useFormFieldBindingAt, useFormSchemaProperty } from './field-binding.tsx';
import { type FormFieldBinding, FormFieldBindingProvider } from './FormFieldContext.ts';
import { FormFieldDispatch } from './FormFieldDispatch.tsx';
import { presentationFor } from './presentation.tsx';

const FORM_FIELD_NAME = 'Form.Field';

/** A bound value rendered as text: what a `static` presentation shows in place of the control. */
export const FormStaticValue = ({ value, format }: { value: unknown; format?: Format.TypeFormat }) => (
  <Next.Typography truncate>{formatStaticValue(value, format)}</Next.Typography>
);

export type FormFieldProps<T = any> = PropsWithChildren<{
  /** Binds the row to the form model at this path; with no children the dispatcher picks the control. */
  path?: string;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  readonly?: boolean;
  /** The label is text rather than a `<label>`: the row holds no single control. */
  standalone?: boolean;
  /** Read-only content after the label text, a sibling of the label so its text stays exactly `label`. */
  labelEnd?: ReactNode;
  /** `beside`: the control carries its own label (a Switch), so the row draws no header. */
  labelPlacement?: FormFieldLabelPlacement;
  presentation?: FormPresentation;
  renderStatic?: (value: T | undefined) => ReactNode;
}>;

/** The leaf row, bound (`path`) or not; same contract as the current `Form.Field`. */
export const FormField = <T,>({ path, children, ...props }: FormFieldProps<T>) => {
  if (path !== undefined) {
    return children === undefined ? (
      <FormBoundFieldDispatch path={path} {...props} />
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

export type FormFieldRowProps<T = any> = Omit<FormFieldProps<T>, 'path'> & {
  format?: Format.TypeFormat;
  binding?: FormFieldBinding<T>;
};

/**
 * The row: `Field.Root` holding the header (label, `labelEnd`, error mark), the description, the control and the
 * error text. In the `settings` variant it is a bordered row of the content's two tracks (AUDIT §3.2 option 1).
 */
export const FormFieldRow = <T,>({
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
}: FormFieldRowProps<T>) => {
  const { variant = 'default', layout } = useFormContext(FORM_FIELD_NAME);
  const settings = variant === 'settings';
  const resolved = presentationFor(presentationProp ?? binding?.presentation ?? layout);
  const error = binding?.error ?? errorProp;
  const readonly = binding?.readonly ?? readonlyProp;
  const required = binding ? binding.required && isEmptyValue(binding.value) : requiredProp;

  let control: ReactNode = children;
  if (binding && resolved.isStatic) {
    if (binding.value == null) {
      return null;
    }
    control = renderStatic?.(binding.value) ?? <FormStaticValue value={binding.value} format={format} />;
  }

  // A toggle labels itself, except in a settings row, whose header column holds every label.
  const showHeader = resolved.showLabel && !!label && (labelPlacement !== 'beside' || settings);
  const row = (
    <Next.Field.Root
      layout={settings ? 'row' : 'stack'}
      level={settings ? '+1' : undefined}
      invalid={!!error}
      required={!!required}
      readOnly={readonly}
      // Focus leaving the row (not moving between its segments, steppers or triggers) marks it touched, so controls need
      // no onBlur of their own.
      onBlur={
        binding
          ? (event) => {
              if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
                binding.onBlur(event);
              }
            }
          : undefined
      }
    >
      {showHeader && (
        <Next.Field.Header>
          {standalone || readonly ? (
            <Next.Typography truncate>{label}</Next.Typography>
          ) : (
            <Next.Field.Label>{label}</Next.Field.Label>
          )}
          {labelEnd}
          {error && (
            <Next.Block>
              <Next.Icon icon='ph--warning--regular' valence='error' label={error} />
            </Next.Block>
          )}
        </Next.Field.Header>
      )}
      {settings && description && <Next.Field.HelperText>{description}</Next.Field.HelperText>}
      {control}
      {resolved.showError && error && <Next.Field.ErrorText>{error}</Next.Field.ErrorText>}
    </Next.Field.Root>
  );

  return binding ? <FormFieldBindingProvider {...binding}>{row}</FormFieldBindingProvider> : row;
};

FormFieldRow.displayName = 'Form.FieldRow';
