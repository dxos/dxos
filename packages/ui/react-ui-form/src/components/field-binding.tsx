//
// Copyright 2024 DXOS.org
//

import { format as formatDate } from 'date-fns';
import * as Option from 'effect/Option';
import * as Str from 'effect/String';
import React, { Component, type PropsWithChildren, useMemo } from 'react';

import { Format } from '@dxos/echo';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import * as Banner from '@dxos/react-ui/Banner';

import { type FormPresentation } from '#types';

import { useFormContext, useFormFieldState } from '../hooks/index.ts';
import { type FormFieldBinding } from './FormFieldContext.ts';
import { resolveLayoutField } from './layout/resolve-layout-field.ts';

/**
 * Formats a value for `static` (read-only, plain-DOM) presentation based on its
 * type `format`. Dates/times are rendered human-readable; everything else falls
 * back to `String(value)`.
 */
export const formatStaticValue = (value: unknown, format?: Format.TypeFormat): string => {
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
export const useFormFieldBindingAt = <T,>(
  componentName: string,
  path: string,
  property: SchemaProperty,
  { required, readonly, presentation }: { required?: boolean; readonly?: boolean; presentation?: FormPresentation },
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

/** Whether a value counts as unfilled for the required marker. `false` and `0` are values. */
export const isEmptyValue = (value: unknown): boolean =>
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
        <Banner.Root valence='error'>
          <Banner.Body>{`ERROR ${String(this.props.path?.join('.'))}`}</Banner.Body>
        </Banner.Root>
      );
    }

    return this.props.children;
  }

  private resetError() {
    this.setState({ error: undefined });
  }
}
