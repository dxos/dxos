//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ChangeEvent, useCallback } from 'react';

import { Input } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type FormFieldRendererProps } from '#types';

import { Form } from '../Form';
import { FormFieldWrapper } from './FormFieldWrapper';

const DefaultStory = ({
  type,
  placeholder,
  readonly,
  onBlur,
  onValueChange,
  ...props
}: FormFieldRendererProps<string>) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );

  return (
    <Form.Root>
      <Form.Viewport>
        <Form.Content>
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
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-form/FormFieldWrapper',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
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
