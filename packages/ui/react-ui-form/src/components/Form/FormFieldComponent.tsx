//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import React, {
  Component,
  type FC,
  type FocusEvent,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react';

import { type Format } from '@dxos/echo/internal';
import { type SimpleType } from '@dxos/effect';
import { Icon, Input, Tooltip } from '@dxos/react-ui';
import { labelSpacing } from '@dxos/react-ui-stack';
import { errorText, mx } from '@dxos/react-ui-theme';

import { type FormFieldStatus } from '../../hooks';

/**
 * Dynamic props passed to input components.
 */
export type FormFieldStateProps<T = any> = {
  getStatus: () => FormFieldStatus;
  getValue: () => T | undefined;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onValueChange: (type: SimpleType, value: T) => void;
};

/**
 * Presentation mode.
 *
 * - full: Show label, control, and status.
 * - compact: Show label and control.
 * - inline: Control only.
 * - static: Plain DOM; skip all undefined values.
 */
export type Presentation = 'full' | 'compact' | 'inline' | 'static';

/**
 * Props passed to input components.
 */
export type FormFieldComponentProps<T = any> = {
  ast: SchemaAST.AST;
  type: SimpleType;
  format?: Format.TypeFormat;
  readonly?: boolean;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
  layout?: Presentation;
} & FormFieldStateProps<T>;

/**
 * Form field component.
 */
export type FormFieldComponent = FC<FormFieldComponentProps>;

export type FormFieldMap = Record<string, FormFieldComponent>;

export type FormFieldProvider = (props: {
  prop: string; // TODO(burdon): Path?
  schema: Schema.Schema<any>;
  fieldProps: FormFieldComponentProps;
}) => ReactElement | undefined;

//
// FormFieldLabel
//

export type FormFieldLabelProps = {
  asChild?: boolean;
  error?: string;
} & Pick<FormFieldComponentProps, 'label' | 'readonly'>;

export const FormFieldLabel = ({ label, error, readonly, asChild }: FormFieldLabelProps) => {
  const Label = readonly || asChild ? 'span' : Input.Label;
  const labelProps = readonly || asChild ? { className: 'text-description text-sm' } : { classNames: '!mlb-0 text-sm' };

  return (
    <div role='none' className={mx('flex justify-between items-center', labelSpacing)}>
      <Label {...labelProps}>{label}</Label>
      {error && (
        <Tooltip.Trigger asChild content={error} side='bottom'>
          <Icon icon='ph--warning--regular' size={4} classNames={errorText} />
        </Tooltip.Trigger>
      )}
    </div>
  );
};

FormFieldLabel.displayName = 'Form.FieldLabel';

//
// FormFieldWrapper
//

export type FormFieldWrapperProps<T = any> = Pick<
  FormFieldComponentProps,
  'readonly' | 'label' | 'layout' | 'getStatus' | 'getValue'
> & {
  children?: (props: { value: T }) => ReactNode;
};

export const FormFieldWrapper = <T,>(props: FormFieldWrapperProps<T>) => {
  const { children, readonly, layout, label, getStatus, getValue } = props;
  const { status, error } = getStatus();
  const value = getValue();

  console.log(':::::::::', label, layout, readonly, value);
  if ((readonly || layout === 'static') && value == null) {
    return null;
  }

  const str = String(value ?? '');

  return (
    <Input.Root validationValence={status}>
      {layout !== 'inline' && <FormFieldLabel error={error} readonly={readonly} label={label} />}
      {layout === 'static' ? <p>{str}</p> : children ? children({ value }) : null}
      {layout === 'full' && (
        <Input.DescriptionAndValidation>
          <Input.Validation>{error}</Input.Validation>
        </Input.DescriptionAndValidation>
      )}
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
        <div className='flex gap-2 border border-roseFill font-mono text-sm'>
          <span className='bg-roseFill text-surfaceText pli-1 font-thin'>ERROR</span>
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
