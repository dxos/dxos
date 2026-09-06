//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { mx } from '@dxos/ui-theme';
import { type MessageValence } from '@dxos/ui-types';

import { withLayoutVariants, withTheme } from '../../testing';
import { Icon } from '../Icon';
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

type StoryArgs = Partial<{
  kind: keyof VariantMap;
  label: string;
  labelVisuallyHidden: boolean;
  description: string;
  descriptionVisuallyHidden: boolean;
  validationValence: MessageValence;
  validationMessage: string;
}>;

type RowProps = PropsWithChildren<
  Pick<
    StoryArgs,
    | 'label'
    | 'labelVisuallyHidden'
    | 'description'
    | 'descriptionVisuallyHidden'
    | 'validationMessage'
    | 'validationValence'
  > & {
    /** Lead with the control: a checkbox or switch reads control-then-label. */
    inline?: boolean;
  }
>;

/** Label, control and the meta text on one line, so the valence border and message are seen together. */
const Row = ({
  inline,
  label,
  validationValence,
  labelVisuallyHidden,
  description,
  descriptionVisuallyHidden,
  validationMessage,
  children,
}: RowProps) => (
  <Input.Root validationValence={validationValence}>
    <div className='flex flex-col gap-1'>
      {(inline && (
        <div className='flex items-center gap-2'>
          {children}
          <Input.Label srOnly={labelVisuallyHidden} classNames='shrink-0'>
            {label}
          </Input.Label>
        </div>
      )) || (
        <>
          <Input.Label srOnly={labelVisuallyHidden} classNames='shrink-0'>
            {label}
          </Input.Label>
          {children}
        </>
      )}

      <Input.DescriptionAndValidation
        srOnly={descriptionVisuallyHidden}
        classNames={mx('flex grow shrink-0 text-description whitespace-nowrap', validationMessage && 'justify-end')}
      >
        {validationMessage ? (
          <Input.Validation classNames='block'>{validationMessage}</Input.Validation>
        ) : (
          <Input.Description>{description}</Input.Description>
        )}
      </Input.DescriptionAndValidation>
    </div>
  </Input.Root>
);

const DefaultStory = ({
  kind = 'text',
  label,
  description,
  labelVisuallyHidden,
  descriptionVisuallyHidden,
  validationValence,
  validationMessage,
  ...props
}: StoryArgs) => {
  const control = (() => {
    switch (kind) {
      case 'text':
        return <Input.TextInput {...props} />;
      case 'pin':
        return <Input.PinInput {...props} />;
      case 'textarea':
        return <Input.TextArea {...props} />;
      case 'time':
        return <Input.Time {...props} />;
      case 'date':
        return <Input.Date {...props} />;
      case 'datetime':
        return <Input.DateTime {...props} />;
      case 'checkbox':
        return <Input.Checkbox {...props} />;
      case 'switch':
        return <Input.Switch {...props} />;
    }
  })();

  return (
    <Row
      validationValence={validationValence}
      inline={kind === 'checkbox' || kind === 'switch'}
      label={label}
      labelVisuallyHidden={labelVisuallyHidden}
      description={description}
      descriptionVisuallyHidden={descriptionVisuallyHidden}
      validationMessage={validationMessage}
    >
      {control}
    </Row>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Input',
  component: Input.Root as any,
  render: DefaultStory,
  decorators: [withTheme(), withLayoutVariants({ classNames: 'w-[40rem]' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<StoryArgs & Variant>;

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
];

export const _TextInput: Story = {
  render: () => (
    <div className='flex flex-col gap-3 min-w-[24rem]'>
      {TEXT_INPUT_TYPES.map(({ type, placeholder }) => (
        // `Input.Root` renders no element, so without this wrapper the gap falls between each label
        // and its own field rather than between the groups — making the label spacing look unlike
        // every other story's.
        <div key={type}>
          <Input.Root>
            <Input.Label>{`type="${type}"`}</Input.Label>
            <Input.TextInput type={type} placeholder={placeholder} />
          </Input.Root>
        </div>
      ))}
    </div>
  ),
};

/**
 * MUI-style adornments: text or icon placed inside the input container. The container carries the
 * surface/border/focus (via `focus-within`) and the field renders bare. `subdued` drops the box for a
 * borderless row (compose a bottom rule via `classNames`).
 */
export const TextInputAdornments: Story = {
  render: () => (
    <div className='flex flex-col'>
      <Input.Root>
        <Input.Label>Start icon</Input.Label>
        <Input.TextInput start={<Icon icon='ph--magnifying-glass--regular' size={4} />} placeholder='Search…' />
      </Input.Root>
      <Input.Root>
        <Input.Label>End text</Input.Label>
        <Input.TextInput end={<span className='text-sm'>.dxos.org</span>} placeholder='workspace' />
      </Input.Root>
      <Input.Root>
        <Input.Label>Both</Input.Label>
        <Input.TextInput
          start={<span className='text-sm'>$</span>}
          end={<Icon icon='ph--currency-circle-dollar--regular' size={4} />}
          placeholder='0.00'
        />
      </Input.Root>
    </div>
  ),
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

/**
 * The picker must open at its field. It is positioned through a virtual anchor because the
 * react-aria field keeps an `id` handed to it for its input, so an `Anchor asChild` would leave
 * the popover machine nothing to find and the calendar would open at the page's origin.
 */
const opensAtField = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const canvas = within(canvasElement);
  const [field] = canvasElement.querySelectorAll<HTMLElement>('[data-density]');
  await userEvent.click(canvas.getAllByRole('button')[0]);
  const dialog = await waitFor(async () => {
    const element = document.querySelector<HTMLElement>('[role="dialog"]');
    await expect(element).not.toBeNull();
    return element!;
  });
  await waitFor(async () => {
    const rect = dialog.getBoundingClientRect();
    const anchor = field.getBoundingClientRect();
    await expect(Math.abs(rect.left - anchor.left)).toBeLessThan(8);
    await expect(rect.top).toBeGreaterThanOrEqual(anchor.bottom);
    await expect(rect.top - anchor.bottom).toBeLessThan(16);
  });
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
  play: opensAtField,
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
  play: opensAtField,
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
