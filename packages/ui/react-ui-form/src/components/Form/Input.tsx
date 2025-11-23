//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type Format } from '@dxos/echo';
import { type SimpleType } from '@dxos/effect';
import { Icon, Input, Tooltip } from '@dxos/react-ui';
import { labelSpacing } from '@dxos/react-ui-stack';
import { errorText, mx } from '@dxos/react-ui-theme';

import { type FormInputStateProps } from './FormContext';

/**
 * Props passed to input components.
 */
export type InputProps = {
  type: SimpleType;
  format?: Format.Format;
  label: string;
  placeholder?: string;
  inputOnly?: boolean;
  /**
   * Specifies the readonly variant: either disabled inputs, elements indicating they are usually editable but currently are not; or `static`, a field’s representation as regular content without signifiers that it is ever editable.
   */
  readonly?: 'disabled-input' | 'static' | false;
} & FormInputStateProps;

/**
 * Form input component.
 */
export type InputComponent = FC<InputProps>;

export type InputHeaderProps = {
  error?: string;
  label: string;
  readonly?: boolean;
};

export const InputHeader = ({ error, label, readonly }: InputHeaderProps) => {
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
