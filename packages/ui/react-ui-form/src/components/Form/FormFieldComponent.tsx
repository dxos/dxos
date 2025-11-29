//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import React, { type FC, type FocusEvent, type ReactElement } from 'react';

import { type Format } from '@dxos/echo/internal';
import { type SimpleType } from '@dxos/effect';
import { Icon, Input, Tooltip } from '@dxos/react-ui';
import { labelSpacing } from '@dxos/react-ui-stack';
import { errorText, mx } from '@dxos/react-ui-theme';

export type FormFieldStatus = {
  status?: 'error';
  error?: string;
};

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
 * Props passed to input components.
 */
export type FormFieldComponentProps<T = any> = {
  ast: SchemaAST.AST;
  type: SimpleType;
  format?: Format.TypeFormat;
  label: string;
  placeholder?: string;

  /**
   * Specifies the readonly variant: either disabled inputs, elements indicating they are usually editable but currently are not;
   * or `static`, a field’s representation as regular content without signifiers that it is ever editable.
   */
  // TODO(burdon): Rename 'mode'.
  readonly?: 'disabled' | 'static' | false;

  /**
   * Indicates input used in a list.
   */
  // TODO(burdon): Combine with readonly/mode.
  inline?: boolean;
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

export type FormFieldLabelProps = {
  asChild?: boolean;
  error?: string;
} & Pick<FormFieldComponentProps, 'label' | 'readonly'>;

export const FormFieldLabel = ({ label, error, readonly, asChild }: FormFieldLabelProps) => {
  const Label = readonly || asChild ? 'span' : Input.Label;
  const labelProps = readonly || asChild ? { className: 'text-description text-sm' } : { classNames: '!mlb-0 text-sm' };

  return (
    <div role='none' className={mx('flex justify-between items-center', readonly !== 'static' && '', labelSpacing)}>
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
