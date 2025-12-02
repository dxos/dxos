//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ChangeEvent, useCallback } from 'react';

import { Input } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type FormFieldComponentProps, FormFieldWrapper } from './FormFieldComponent';

const Component = ({
  ast,
  placeholder,
  readonly,
  onBlur,
  onValueChange,
  ...props
}: FormFieldComponentProps<string>) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(ast, event.target.value),
    [ast, onValueChange],
  );

  return (
    <div className='plb-cardSpacingBlock pli-cardSpacingInline'>
      <FormFieldWrapper<string> {...props}>
        {({ value = '' }) => (
          <Input.TextInput
            disabled={!!readonly}
            placeholder={placeholder}
            noAutoFill
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
          />
        )}
      </FormFieldWrapper>
    </div>
  );
};

const meta: Meta<typeof Component> = {
  title: 'ui/react-ui-form/FormFieldComponent',
  component: Component,
  decorators: [withTheme, withLayout({ container: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Label',
    getStatus: () => ({ status: 'error', error: 'Required field' }),
    getValue: () => 'DXOS',
    onBlur: () => {},
    onValueChange: () => {},
  },
};
