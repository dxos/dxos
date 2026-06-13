//
// Copyright 2024 DXOS.org
//

import { format as formatDate } from 'date-fns';
import React, { Component, type PropsWithChildren, type ReactNode } from 'react';

import { Format } from '@dxos/echo';
import { inputTextLabel, Icon, Input, ThemedClassName, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type FormFieldRendererProps } from '#types';

//
// FormFieldLabel
//

export type FormFieldLabelProps = ThemedClassName<
  {
    asChild?: boolean;
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
  } & Pick<FormFieldRendererProps, 'label' | 'readonly'>
>;

export const FormFieldLabel = ({
  classNames,
  label,
  error,
  readonly,
  asChild, // TODO(burdon): ???
  button,
  onClick,
}: FormFieldLabelProps) => {
  const Label = readonly || asChild ? 'span' : Input.Label;
  const labelNode = <Label className={mx(inputTextLabel, 'text-sm')}>{label}</Label>;

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
  'readonly' | 'label' | 'layout' | 'getStatus' | 'getValue' | 'jsonPath' | 'format'
> & {
  children?: (props: { value: T }) => ReactNode;
};

export const FormFieldWrapper = <T,>(props: FormFieldWrapperProps<T>) => {
  const { children, readonly, layout, label, jsonPath, format, getStatus, getValue } = props;
  const { status, error } = getStatus();

  const value = getValue();
  if (layout === 'static' && value == null) {
    return null;
  }

  const str = formatStaticValue(value, format);

  return (
    <div className='contents'>
      <Input.Root validationValence={status}>
        {layout !== 'inline' && <FormFieldLabel error={error} readonly={readonly} label={label} path={jsonPath} />}
        {layout === 'static' ? (
          <p className='truncate min-w-0' title={str}>
            {str}
          </p>
        ) : children ? (
          children({ value })
        ) : null}
        {layout === 'full' && error && (
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
