//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Input } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type FormFieldComponentProps, FormFieldWrapper } from './FormFieldComponent';

const Component = ({
  type,
  placeholder,
  readonly,
  onBlur,
  onValueChange,
  ...props
}: FormFieldComponentProps<string>) => {
  return (
    <FormFieldWrapper<string> {...props}>
      {({ value = '' }) => (
        <Input.TextInput
          disabled={!!readonly}
          placeholder={placeholder}
          noAutoFill
          value={value}
          onChange={(event) => onValueChange(type, event.target.value)}
          onBlur={onBlur}
        />
      )}
    </FormFieldWrapper>
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
