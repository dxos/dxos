//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { type FC, type FocusEvent, type ReactElement } from 'react';

import { type Format } from '@dxos/echo/internal';
import { type SimpleType } from '@dxos/effect';
import { Icon, Input, Tooltip } from '@dxos/react-ui';
import { labelSpacing } from '@dxos/react-ui-stack';
import { errorText, mx } from '@dxos/react-ui-theme';

/**
 * Dynamic props passed to input components.
 */
export type FormFieldStateProps = {
  getStatus: () => { status?: 'error'; error?: string };
  getValue: <V>() => V | undefined;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onValueChange: (type: SimpleType, value: any) => void;
};

/**
 * Props passed to input components.
 */
export type FormFieldComponentProps = {
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
  inputOnly?: boolean;
} & FormFieldStateProps;

/**
 * Form field component.
 */
export type FormFieldComponent = FC<FormFieldComponentProps>;

export type FormFieldMap = Record<string, FormFieldComponent>;

export type FormFieldLookup = (props: {
  prop: string; // TODO(burdon): Path?
  schema: Schema.Schema<any>;
  inputProps: FormFieldComponentProps;
}) => ReactElement | undefined;

export type FormFieldLabelProps = {
  error?: string;
} & Pick<FormFieldComponentProps, 'label' | 'readonly'>;

export const FormFieldLabel = ({ label, error, readonly }: FormFieldLabelProps) => {
  const Label = readonly ? 'span' : Input.Label;
  const labelProps = readonly ? { className: 'text-description text-xs' } : { classNames: '!mlb-0 text-sm' };

  return (
    <div
      role='none'
      className={mx('flex justify-between items-center', readonly !== 'static' && 'pis-2', labelSpacing)}
    >
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
