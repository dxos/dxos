//
// Copyright 2024 DXOS.org
//

import { format as formatDate } from 'date-fns';
import React, { Component, type PropsWithChildren, type ReactNode } from 'react';

import { Format } from '@dxos/echo';
import { Input } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { useFormContext } from '../../../hooks';
import { formTheme } from '../Form.theme';
import { FormFieldLabel } from './FormFieldLabel';
import { type FieldPresentation, presentationFor } from './presentation';

//
// FormFieldWrapper
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

export type FormFieldWrapperProps<T = any> = Pick<
  FormFieldRendererProps<T>,
  'readonly' | 'label' | 'description' | 'presentation' | 'getStatus' | 'getValue' | 'jsonPath' | 'format' | 'required'
> & {
  // `value` is `T | undefined` because `getValue()` returns no value when the field is unset (optional
  // schema properties, freshly-added array items); renderers default it (e.g. `{ value = '' }`).
  children?: (props: { value: T | undefined; presentation: FieldPresentation }) => ReactNode;
  /**
   * Render the label as a standalone `<span>` (group/multi-input fields with no single associated control).
   */
  standalone?: boolean;
  /**
   * Override the read-only/`static` rendering of the value. Fields whose value is not plain text
   * (refs, selects, markdown) supply this; the default formats scalars/dates via `formatStaticValue`.
   * Return `null` to render nothing (e.g. an empty/unresolved value).
   */
  renderStatic?: (value: T | undefined) => ReactNode;
};

const FORM_FIELD_WRAPPER_NAME = 'Form.FieldWrapper';

export const FormFieldWrapper = <T,>(props: FormFieldWrapperProps<T>) => {
  const {
    children,
    readonly,
    presentation,
    label,
    description,
    jsonPath,
    format,
    required,
    standalone,
    renderStatic,
    getStatus,
    getValue,
  } = props;
  const { variant = 'default' } = useFormContext(FORM_FIELD_WRAPPER_NAME);
  const styles = formTheme.styles({ variant });
  const { showDescription } = formTheme.behavior[variant];

  const value: T | undefined = getValue();
  const resolved = presentationFor(presentation);
  if (resolved.isStatic && value == null) {
    return null;
  }

  const { status, error } = getStatus();

  return (
    <Input.Root validationValence={status}>
      <div className={styles.field()}>
        {/* Label */}
        {resolved.showLabel && (
          <FormFieldLabel
            variant={variant}
            error={error}
            readonly={readonly}
            required={required}
            standalone={standalone}
            label={label}
            path={jsonPath}
          />
        )}
        {/* Description */}
        {showDescription && description && (
          <Input.Description classNames={styles.description()}>{description}</Input.Description>
        )}
        {/* Control */}
        <div className={styles.control()}>
          {resolved.isStatic
            ? (renderStatic?.(value) ?? <p className='truncate min-w-0'>{formatStaticValue(value, format)}</p>)
            : children
              ? children({ value, presentation: resolved })
              : null}
        </div>
        {/* Error */}
        {resolved.showError && error && (
          <div className={styles.validation()}>
            <Input.DescriptionAndValidation>
              <Input.Validation>{error}</Input.Validation>
            </Input.DescriptionAndValidation>
          </div>
        )}
      </div>
    </Input.Root>
  );
};

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
