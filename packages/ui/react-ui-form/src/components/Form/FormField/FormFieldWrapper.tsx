//
// Copyright 2024 DXOS.org
//

import { format as formatDate } from 'date-fns';
import React, { Component, type PropsWithChildren, type ReactNode } from 'react';

import { Format } from '@dxos/echo';
import { inputTextLabel, Icon, Input, ThemedClassName, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type FormFieldRendererProps } from '#types';

import { useFormContext } from '../../../hooks';
import { formTheme } from '../Form.theme';
import { type FieldPresentation, presentationFor } from './presentation';

//
// FormFieldLabel
//

export type FormFieldLabelProps = ThemedClassName<
  {
    /** Render a plain `<span>` instead of an input-associated `Input.Label`, for labels used outside an `Input.Root` (e.g. section/group headers). */
    standalone?: boolean;
    /** Class applied to the inner label text node, overriding the default size/color (e.g. `text-lg`). */
    labelClassName?: string;
    error?: string;
    /**
     * JSON path of the field this label describes (e.g. `runtime.client.storage.persistent`).
     * Field metadata; accepted by callers but not currently rendered.
     */
    path?: string;
    /**
     * Trailing button rendered at the end of the label row (third grid column).
     * Used by nested-object field sets to surface a collapse toggle.
     */
    button?: ReactNode;
    onClick?: () => void;
  } & Pick<FormFieldRendererProps, 'label' | 'readonly' | 'required'>
>;

export const FormFieldLabel = ({
  classNames,
  labelClassName,
  label,
  error,
  readonly,
  required,
  standalone,
  button,
  onClick,
}: FormFieldLabelProps) => {
  // Render the required asterisk via a `::after` pseudo-element rather than a DOM node: it keeps the
  // label's `textContent` exactly `label`, so fields stay locatable by their exact label text
  // (`getByLabelText('Name')`), which the DOM-text-based query would otherwise miss as `Name *`.
  // `labelClassName` is appended last so a caller-supplied size/color (e.g. `text-lg`) wins over the
  // `text-sm`/`text-description` baked into `inputTextLabel`.
  const labelClassNames = mx(
    inputTextLabel,
    required && "after:content-['*'] after:ms-0.5 after:text-warning-text",
    labelClassName,
  );
  // `Input.Label` is a themed primitive that reads `classNames` (and ignores `className`), whereas the
  // plain `span` used for read-only/standalone labels reads `className`.
  const labelNode =
    readonly || standalone ? (
      <span className={labelClassNames}>{label}</span>
    ) : (
      <Input.Label classNames={labelClassNames}>{label}</Input.Label>
    );

  return (
    <div
      className={mx('grid grid-cols-[1fr_auto_auto] items-center select-none', onClick && 'cursor-pointer', classNames)}
      onClick={onClick}
    >
      {labelNode}
      {error ? (
        <Tooltip.Trigger asChild content={error} side='bottom'>
          <Icon icon='ph--warning--regular' size={4} classNames='text-error-text' />
        </Tooltip.Trigger>
      ) : (
        <span />
      )}
      {button}
    </div>
  );
};

FormFieldLabel.displayName = 'Form.FieldLabel';

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
  FormFieldRendererProps,
  'readonly' | 'label' | 'description' | 'presentation' | 'getStatus' | 'getValue' | 'jsonPath' | 'format' | 'required'
> & {
  children?: (props: { value: T; presentation: FieldPresentation }) => ReactNode;
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
  const resolved = presentationFor(presentation);
  const { status, error } = getStatus();
  const value = getValue();
  // Omit an entirely-absent value in static presentation — a labelled row with no value is just noise.
  // Fields with richer "empty" semantics (e.g. a present-but-unresolved ref) handle that in `renderStatic`.
  if (resolved.isStatic && value == null) {
    return null;
  }

  const str = formatStaticValue(value, format);
  const control = resolved.isStatic
    ? (renderStatic?.(value) ?? <p className='truncate min-w-0'>{str}</p>)
    : children
      ? children({ value, presentation: resolved })
      : null;

  return (
    <div className={styles.field()}>
      <Input.Root validationValence={status}>
        {resolved.showLabel && (
          <FormFieldLabel
            classNames={styles.labelContainer()}
            labelClassName={styles.labelText()}
            error={error}
            readonly={readonly}
            required={required}
            standalone={standalone}
            label={label}
            path={jsonPath}
          />
        )}
        {showDescription && description && (
          <Input.Description classNames={styles.description()}>{description}</Input.Description>
        )}
        <div className={styles.control()}>{control}</div>
        {resolved.showError && error && (
          <Input.DescriptionAndValidation>
            <Input.Validation>{error}</Input.Validation>
          </Input.DescriptionAndValidation>
        )}
      </Input.Root>
    </div>
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
