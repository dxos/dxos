//
// Copyright 2024 DXOS.org
//

import { format as formatDate } from 'date-fns';
import React, { Component, type PropsWithChildren, type ReactNode, type Ref } from 'react';

import { Format } from '@dxos/echo';
import { Icon, Input, type ThemedClassName, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type FormFieldRendererProps } from '#types';

import { useFormContext } from '../../../hooks';
import { type FormVariant, formTheme } from '../Form.theme';
import { type FormFieldPresentation, presentationFor } from './presentation';

//
// FormFieldLabel
//

export type FormFieldLabelProps = ThemedClassName<
  {
    /** Render a plain `<span>` instead of an input-associated `Input.Label`, for labels used outside an `Input.Root` (e.g. section/group headers). */
    standalone?: boolean;
    /** Class applied to the inner label text node, overriding the default size/color (e.g. `text-lg`). */
    labelClassName?: string;
    /** Form variant; selects the label's chrome (e.g. `settings` enlarges the text and places it in the field grid). */
    variant?: FormVariant;
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
  variant = 'default',
  label,
  error,
  readonly,
  required,
  standalone,
  button,
  onClick,
}: FormFieldLabelProps) => {
  const styles = formTheme.styles({ variant });
  // Render the required asterisk via a `::after` pseudo-element rather than a DOM node: it keeps the
  // label's `textContent` exactly `label`, so fields stay locatable by their exact label text
  // (`getByLabelText('Name')`), which the DOM-text-based query would otherwise miss as `Name *`.
  // The `fieldLabelText` slot is applied last so a variant/caller size/color (e.g. `text-lg`) wins over
  const labelClassNames = mx(
    'text-sm text-description',
    required && "after:content-['*'] after:ms-0.5 after:text-warning-text",
    styles.fieldLabelText({ class: labelClassName }),
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
    <div className={styles.fieldLabel({ class: mx(onClick && 'cursor-pointer', classNames) })} onClick={onClick}>
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
// FormRow
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

const FORM_ROW_NAME = 'Form.Row';

export type FormRowProps<T = any> = ThemedClassName<
  Pick<FormFieldRendererProps<T>, 'readonly' | 'label' | 'description' | 'presentation' | 'required'> &
    Partial<Pick<FormFieldRendererProps<T>, 'getStatus' | 'getValue' | 'jsonPath' | 'format'>> & {
      /**
       * Ref to the row's outer element. Enables measurement/positioning (e.g. a future virtualized
       * field set) without forwarding through the generic component.
       */
      rootRef?: Ref<HTMLDivElement>;
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
      /**
       * Validation/error content rendered in the validation slot. Supplied directly in action mode; in
       * field mode it is derived from `getStatus`.
       */
      validation?: ReactNode;
      /**
       * The control. A render-prop binds to the form value (field mode: `Input.Root` validation, static
       * rendering, value via `getValue`). Plain nodes render an arbitrary control with no value wiring
       * (action mode, e.g. a button) — the labeled-card escape hatch that replaces `Settings.Item`.
       *
       * `value` is `T | undefined` because `getValue()` returns no value when the field is unset (optional
       * schema properties, freshly-added array items); renderers default it (e.g. `{ value = '' }`).
       */
      children?: ReactNode | ((props: { value: T | undefined; presentation: FormFieldPresentation }) => ReactNode);
    }
>;

/**
 * A labeled card row — the single shell behind both schema fields and free-form "action" rows. Field
 * renderers pass a render-prop `children` (field mode: bound to the form value, with validation and
 * static rendering); consumers pass plain `children` for an arbitrary control (action mode), the
 * affordance that replaces the deprecated `Settings.Item`.
 */
export const FormRow = <T,>({
  classNames,
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
  validation,
  getStatus,
  getValue,
  rootRef,
}: FormRowProps<T>) => {
  const { variant = 'default' } = useFormContext(FORM_ROW_NAME);
  const styles = formTheme.styles({ variant });
  const { showDescription } = formTheme.behavior[variant];
  const resolved = presentationFor(presentation);

  //
  // Field mode: a render-prop control bound to the form value.
  //
  if (typeof children === 'function' && getStatus && getValue) {
    const { status, error } = getStatus();
    const value: T | undefined = getValue();
    if (resolved.isStatic && value == null) {
      return null;
    }

    const control = resolved.isStatic
      ? (renderStatic?.(value) ?? <p className='truncate min-w-0'>{formatStaticValue(value, format)}</p>)
      : children({ value, presentation: resolved });

    return (
      <Input.Root validationValence={status}>
        <div className={styles.field({ class: classNames })} ref={rootRef}>
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
          {showDescription && description && (
            <Input.Description classNames={styles.fieldDescription()}>{description}</Input.Description>
          )}
          <div className={styles.fieldControl()}>{control}</div>
          {resolved.showError && error && (
            <div className={styles.fieldValidation()}>
              <Input.DescriptionAndValidation>
                <Input.Validation>{error}</Input.Validation>
              </Input.DescriptionAndValidation>
            </div>
          )}
        </div>
      </Input.Root>
    );
  }

  //
  // Action mode: an arbitrary control with a standalone label; no value/`Input.Root` wiring.
  //
  return (
    <div ref={rootRef} className={styles.field({ class: classNames })}>
      {resolved.showLabel && label && (
        <FormFieldLabel
          variant={variant}
          readonly={readonly}
          required={required}
          standalone
          label={label}
          path={jsonPath}
        />
      )}
      {showDescription && description && <p className={styles.fieldDescription()}>{description}</p>}
      <div className={styles.fieldControl()}>{typeof children === 'function' ? null : children}</div>
      {validation && <div className={styles.fieldValidation()}>{validation}</div>}
    </div>
  );
};

FormRow.displayName = FORM_ROW_NAME;

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
