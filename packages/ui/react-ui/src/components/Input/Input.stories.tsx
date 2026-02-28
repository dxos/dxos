//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type MessageValence } from '@dxos/ui-types';

import { withLayoutVariants, withTheme } from '../../testing';

import {
  type CheckboxProps,
  Input,
  type PinInputProps,
  type SwitchProps,
  type TextAreaProps,
  type TextInputProps,
} from './Input';

type VariantMap = {
  text: TextInputProps;
  pin: PinInputProps;
  textarea: TextAreaProps;
  checkbox: CheckboxProps;
  switch: SwitchProps;
};

type Variant = { [K in keyof VariantMap]: { type: K } & VariantMap[K] }[keyof VariantMap];

type StoryProps = Partial<{
  kind: keyof VariantMap;
  label: string;
  labelVisuallyHidden: boolean;
  description: string;
  descriptionVisuallyHidden: boolean;
  validationValence: MessageValence;
  validationMessage: string;
}>;

const DefaultStory = ({
  kind,
  label,
  description,
  labelVisuallyHidden,
  descriptionVisuallyHidden,
  validationValence,
  validationMessage,
  ...props
}: StoryProps) => {
  return (
    <Input.Root {...{ validationValence }}>
      <Input.Label srOnly={labelVisuallyHidden}>{label}</Input.Label>

      {kind === 'text' && <Input.TextInput {...props} />}
      {kind === 'pin' && <Input.PinInput {...props} />}
      {kind === 'textarea' && <Input.TextArea {...props} />}
      {kind === 'checkbox' && <Input.Checkbox {...props} />}
      {kind === 'switch' && <Input.Switch {...props} />}

      <Input.DescriptionAndValidation srOnly={descriptionVisuallyHidden}>
        {validationMessage && <Input.Validation classNames='block'>{validationMessage}</Input.Validation>}
        <Input.Description>{description}</Input.Description>
      </Input.DescriptionAndValidation>
    </Input.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Input',
  component: Input.Root as any,
  render: DefaultStory,
  decorators: [withTheme(), withLayoutVariants()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<StoryProps & Variant>;

export const DensityCoarse: Story = {
  args: {
    kind: 'text',
    label: 'Input value',
    placeholder: 'This is an input',
    disabled: false,
    description: undefined,
    labelVisuallyHidden: false,
    descriptionVisuallyHidden: false,
    validationMessage: '',
    validationValence: undefined,
    density: 'coarse',
  },
};

export const DensityFine: Story = {
  args: {
    kind: 'text',
    label: 'Input value',
    placeholder: 'This is a density:fine input',
    disabled: false,
    description: undefined,
    labelVisuallyHidden: false,
    descriptionVisuallyHidden: false,
    validationMessage: '',
    validationValence: undefined,
    density: 'fine',
  },
};

export const Subdued: Story = {
  args: {
    kind: 'text',
    label: 'Input value',
    placeholder: 'This is a subdued input',
    disabled: false,
    description: undefined,
    labelVisuallyHidden: false,
    descriptionVisuallyHidden: false,
    validationMessage: '',
    validationValence: undefined,
    variant: 'subdued',
  },
};

export const Disabled: Story = {
  args: {
    kind: 'text',
    label: 'Disabled',
    placeholder: 'This is a disabled input',
    disabled: true,
  },
};

export const LabelVisuallyHidden: Story = {
  args: {
    kind: 'text',
    label: 'The label is for screen readers',
    labelVisuallyHidden: true,
    placeholder: 'The label for this input exists but is only read by screen readers',
  },
};

export const WithDescription: Story = {
  args: {
    kind: 'text',
    label: 'Described input',
    placeholder: 'This input has an accessible description',
    description: 'This helper text is accessibly associated with the input.',
  },
};

export const WithErrorAndDescription: Story = {
  args: {
    kind: 'text',
    label: 'Described invalid input',
    placeholder: 'This input has both an accessible description and a validation error',
    description: 'This description is identified separately in the accessibility tree.',
    validationValence: 'error',
    validationMessage: 'The input has an error.',
  },
};

export const WithValidationAndDescription: Story = {
  args: {
    kind: 'text',
    label: 'Described input with validation message',
    placeholder: 'This input is styled to express a validation valence',
    description: 'This description is extra.',
    validationValence: 'success',
    validationMessage: 'This validation message is really part of the description.',
  },
};

export const TextArea: Story = {
  args: {
    kind: 'textarea',
    label: 'This input is a text area input',
    description: 'Type a long paragraph',
    placeholder: 'Lorem ipsum dolor sit amet',
  },
};

export const PinInput: Story = {
  args: {
    kind: 'pin',
    label: 'This input is a PIN-style input',
    length: 6,
    description: 'Type in secret you received',
    pattern: '\\d*',
    density: 'coarse',
  },
};

export const Checkbox: Story = {
  args: {
    kind: 'checkbox',
    label: 'This is a checkbox',
    description: 'Checked, indeterminate, or unchecked',
    size: 5,
  },
};

export const Switch: Story = {
  args: {
    kind: 'switch',
    label: 'This is a switch',
    description: 'On or off',
  },
};
