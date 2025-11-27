//
// Copyright 2024 DXOS.org
//

import React, { type FC, type FocusEvent } from 'react';

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
  inputOnly?: boolean;
  /**
   * Specifies the readonly variant: either disabled inputs, elements indicating they are usually editable but currently are not;
   * or `static`, a field’s representation as regular content without signifiers that it is ever editable.
   */
  // TODO(burdon): Rename 'mode'.
  readonly?: 'disabled-input' | 'static' | false;
} & FormFieldStateProps;

/**
 * Form field component.
 */
export type FormFieldComponent = FC<FormFieldComponentProps>;

export type FormFieldLabelProps = {
  label: string;
  error?: string;
  readonly?: boolean;
};

export const FormFieldLabel = ({ label, error, readonly }: FormFieldLabelProps) => {
  const Label = readonly ? 'span' : Input.Label;
  const labelProps = readonly ? {} : { classNames: '!mlb-0' };
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
