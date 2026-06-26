//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type MessageValence } from '@dxos/ui-types';

import { withLayoutVariants, withTheme } from '../../testing';
import {
  type CheckboxProps,
  type DateInputProps,
  type DateTimeInputProps,
  Input,
  type PinInputProps,
  type SwitchProps,
  type TextAreaProps,
  type TextInputProps,
  type TimeProps,
} from './Input';

type VariantMap = {
  text: TextInputProps;
  pin: PinInputProps;
  textarea: TextAreaProps;
  time: TimeProps;
  date: DateInputProps;
  datetime: DateTimeInputProps;
  checkbox: CheckboxProps;
  switch: SwitchProps;
};

type Variant = { [K in keyof VariantMap]: { type: K } & VariantMap[K] }[keyof VariantMap];

type DefaultStoryProps = Partial<{
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
}: DefaultStoryProps) => {
  return (
    <Input.Root {...{ validationValence }}>
      <Input.Label srOnly={labelVisuallyHidden}>{label}</Input.Label>

      {kind === 'text' && <Input.TextInput {...props} />}
      {kind === 'pin' && <Input.PinInput {...props} />}
      {kind === 'textarea' && <Input.TextArea {...props} />}
      {kind === 'time' && <Input.Time {...props} />}
      {kind === 'date' && <Input.Date {...props} />}
      {kind === 'datetime' && <Input.DateTime {...props} />}
      {kind === 'checkbox' && (
        <Input.Block>
          <Input.Checkbox {...props} />
        </Input.Block>
      )}
      {kind === 'switch' && (
        <Input.Block>
          <Input.Switch {...props} />
        </Input.Block>
      )}

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

type Story = StoryObj<DefaultStoryProps & Variant>;

export const Density: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      {(['lg', 'md', 'sm', 'xs'] as const).map((density) => (
        <Input.Root key={density}>
          <Input.Label>{`density="${density}"`}</Input.Label>
          <Input.TextInput density={density} placeholder={`This is a density:${density} input`} />
        </Input.Root>
      ))}
    </div>
  ),
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
    density: 'lg',
  },
};

export const Time: Story = {
  args: {
    kind: 'time',
    label: 'Time',
    defaultValue: '09:30',
  },
};

export const TimeUncontrolled: Story = {
  args: {
    kind: 'time',
    label: 'Time (uncontrolled)',
    defaultValue: '14:00',
  },
};

export const TimeAmPm: Story = {
  args: {
    kind: 'time',
    label: 'Time (12-hour, AM/PM)',
    defaultValue: '14:00',
    hourCycle: 12,
  } as any,
};

export const TimeDisabled: Story = {
  args: {
    kind: 'time',
    label: 'Time (disabled)',
    defaultValue: '12:00',
    disabled: true,
  },
};

export const Date: Story = {
  args: {
    kind: 'date',
    label: 'Date',
    defaultValue: '1990-05-12',
  },
};

export const DateTime: Story = {
  args: {
    kind: 'datetime',
    label: 'Date & time',
    defaultValue: '2026-06-01T15:30',
  },
};

export const DateWithPicker: Story = {
  render: () => (
    <Input.Root>
      <Input.Label>Date (with picker)</Input.Label>
      <div className='flex items-center gap-1'>
        <Input.Date defaultValue='2026-06-01' />
        <Input.TriggerIcon />
      </div>
      <Input.Description>Click the calendar icon to open the date picker.</Input.Description>
    </Input.Root>
  ),
};

export const DateTimeWithPicker: Story = {
  render: () => (
    <Input.Root>
      <Input.Label>Date & time (with picker)</Input.Label>
      <div className='flex items-center gap-1'>
        <Input.DateTime defaultValue='2026-06-01T15:30' />
        <Input.TriggerIcon />
      </div>
      <Input.Description>Click the calendar icon to open the date picker.</Input.Description>
    </Input.Root>
  ),
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

/**
 * Native HTML input types. `Input.TextInput` accepts every standard
 * `<input type="…">` value via its `type` prop; this story exercises the most
 * commonly used ones so the rendering across themes/browsers can be
 * inspected at a glance.
 */
const TEXT_INPUT_TYPES: { type: string; placeholder: string }[] = [
  { type: 'text', placeholder: 'Plain text' },
  { type: 'email', placeholder: 'name@example.com' },
  { type: 'password', placeholder: '••••••••' },
  { type: 'search', placeholder: 'Search…' },
  { type: 'tel', placeholder: '+1 (555) 555-5555' },
  { type: 'url', placeholder: 'https://example.com' },
  { type: 'number', placeholder: '42' },
  { type: 'date', placeholder: '' },
  { type: 'time', placeholder: '' },
  { type: 'datetime-local', placeholder: '' },
  { type: 'month', placeholder: '' },
  { type: 'week', placeholder: '' },
  { type: 'color', placeholder: '' },
];

export const TextInputTypes: Story = {
  render: () => (
    <div className='flex flex-col gap-3 min-w-[24rem]'>
      {TEXT_INPUT_TYPES.map(({ type, placeholder }) => (
        <Input.Root key={type}>
          <Input.Label>{`type="${type}"`}</Input.Label>
          <Input.TextInput type={type} placeholder={placeholder} />
        </Input.Root>
      ))}
    </div>
  ),
};
