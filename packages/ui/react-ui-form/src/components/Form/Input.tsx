//
// Copyright 2024 DXOS.org
//

import React, { type FC, type PropsWithChildren } from 'react';

import { type BaseObject, type FormatEnum, type PropertyKey } from '@dxos/echo-schema';
import { type SimpleType } from '@dxos/effect';
import { Icon, Tooltip } from '@dxos/react-ui';
import { errorText } from '@dxos/react-ui-theme';

import { type FormHandler } from '../../hooks';

/**
 * Props passed to input components.
 */
export type InputProps<T extends BaseObject> = {
  property: PropertyKey<T>;
  type: SimpleType;
  format?: FormatEnum;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  inputOnly?: boolean;
} & Pick<FormHandler<T>, 'getStatus' | 'getValue' | 'onValueChange' | 'onBlur'>;

/**
 * Form input component.
 */
export type InputComponent<T extends BaseObject> = FC<InputProps<T>>;

export type InputHeaderProps = PropsWithChildren<{
  error?: string;
}>;

export const InputHeader = ({ children, error }: InputHeaderProps) => {
  return (
    <div role='none' className='flex justify-between items-center mb-1'>
      {children}
      {error && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Icon icon='ph--warning--regular' size={4} classNames={errorText} />
          </Tooltip.Trigger>
          <Tooltip.Content side='bottom'>
            <Tooltip.Arrow />
            {error}
          </Tooltip.Content>
        </Tooltip.Root>
      )}
    </div>
  );
};
