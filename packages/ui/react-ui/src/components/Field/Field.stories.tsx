//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { mx } from '@dxos/ui-theme';
import { type MessageValence } from '@dxos/ui-types';

import { withLayout, withLayoutVariants, withTheme } from '../../testing';
import { Icon } from '../Icon';
import {
  type CheckboxProps,
  type DateInputProps,
  type DateTimeInputProps,
  Field,
  type InputProps,
  type PinInputProps,
  type SwitchProps,
  type TextareaProps,
  type TimeProps,
} from './Field';

type VariantMap = {
  text: InputProps;
  pin: PinInputProps;
  textarea: TextareaProps;
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
    /** The control carries its own label (a checkbox or switch with label children), so the row adds none. */
    selfLabelled?: boolean;
  }
>;

/** Label, control and the meta text on one line, so the valence border and message are seen together. */
const Row = ({
  selfLabelled,
  label,
  validationValence,
  labelVisuallyHidden,
  description,
  descriptionVisuallyHidden,
  validationMessage,
  children,
}: RowProps) => (
  <Field.Root validationValence={validationValence}>
    <div className='flex flex-col gap-1'>
      {selfLabelled ? (
        children
      ) : (
        <>
          <Field.Label srOnly={labelVisuallyHidden} classNames='shrink-0'>
            {label}
          </Field.Label>
          {children}
        </>
      )}

      <div
        className={mx(
          'flex grow shrink-0 text-description whitespace-nowrap',
          validationMessage && 'justify-end',
          descriptionVisuallyHidden && 'sr-only',
        )}
      >
        {validationMessage ? (
          <Field.ErrorText classNames='block'>{validationMessage}</Field.ErrorText>
        ) : (
          <Field.HelperText>{description}</Field.HelperText>
        )}
      </div>
    </div>
  </Field.Root>
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
        return <Field.Input {...props} />;
      case 'pin':
        return <Field.PinInput {...props} />;
      case 'textarea':
        return <Field.Textarea {...props} />;
      case 'time':
        return <Field.Time {...props} />;
      case 'date':
        return <Field.Date {...props} />;
      case 'datetime':
        return <Field.DateTime {...props} />;
      case 'checkbox':
        return <Field.Checkbox {...props}>{label}</Field.Checkbox>;
      case 'switch':
        return <Field.Switch {...props}>{label}</Field.Switch>;
    }
  })();

  return (
    <Row
      validationValence={validationValence}
      selfLabelled={kind === 'checkbox' || kind === 'switch'}
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
  title: 'ui/react-ui-core/components/Field',
  component: Field.Root as any,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayoutVariants(),
    withLayout({ layout: 'column', scroll: true, classNames: 'bg-transparent' }),
  ],
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

export const WithError: Story = {
  args: {
    kind: 'text',
    label: 'Described invalid input',
    placeholder: 'This input has both an accessible description and a validation error',
    description: 'This description is identified separately in the accessibility tree.',
    validationValence: 'error',
    validationMessage: 'The input has an error.',
  },
};

/**
 * Native HTML input types. `Field.Input` accepts every standard
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

export const Input: Story = {
  render: () => (
    <div className='flex flex-col gap-3 min-w-[24rem]'>
      {TEXT_INPUT_TYPES.map(({ type, placeholder }) => (
        // `Field.Root` renders no element, so without this wrapper the gap falls between each label
        // and its own field rather than between the groups — making the label spacing look unlike
        // every other story's.
        <div key={type}>
          <Field.Root>
            <Field.Label>{`type="${type}"`}</Field.Label>
            <Field.Input type={type} placeholder={placeholder} />
          </Field.Root>
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
export const InputAdornments: Story = {
  render: () => (
    <div className='flex flex-col'>
      <Field.Root>
        <Field.Label>Start icon</Field.Label>
        <Field.Input start={<Icon icon='ph--magnifying-glass--regular' size={4} />} placeholder='Search…' />
      </Field.Root>
      <Field.Root>
        <Field.Label>End text</Field.Label>
        <Field.Input end={<span className='text-sm'>.dxos.org</span>} placeholder='workspace' />
      </Field.Root>
      <Field.Root>
        <Field.Label>Both</Field.Label>
        <Field.Input
          start={<span className='text-sm'>$</span>}
          end={<Icon icon='ph--currency-circle-dollar--regular' size={4} />}
          placeholder='0.00'
        />
      </Field.Root>
    </div>
  ),
};

export const TextArea: Story = {
  args: {
    kind: 'textarea',
    label: 'This input is a text area input',
    description: 'Type a long paragraph',
    placeholder: 'Lorem ipsum dolor sit amet',
  },
};

/** The control is one `<label>` holding its text and its form input, so clicking the text toggles it. */
const togglesFromItsLabel = async (canvasElement: HTMLElement, label: string) => {
  const root = canvasElement.querySelector('label') as HTMLLabelElement;
  await expect(root).toHaveTextContent(label);
  const input = root.querySelector('input') as HTMLInputElement;
  await expect(input.checked).toBe(false);
  await userEvent.click(within(root).getByText(label));
  await expect(input.checked).toBe(true);
  await userEvent.click(within(root).getByText(label));
  await expect(input.checked).toBe(false);
  await userEvent.click(within(root).getByText(label));
  await expect(input.checked).toBe(true);
};

export const Checkbox: Story = {
  args: {
    kind: 'checkbox',
    label: 'This is a checkbox',
    description: 'Checked, indeterminate, or unchecked',
    size: 5,
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) =>
    togglesFromItsLabel(canvasElement, 'This is a checkbox'),
};

export const Switch: Story = {
  args: {
    kind: 'switch',
    label: 'This is a switch',
    description: 'On or off',
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) =>
    togglesFromItsLabel(canvasElement, 'This is a switch'),
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
    <Field.Root>
      <Field.Label>Date (with picker)</Field.Label>
      <div className='flex items-center gap-1'>
        <Field.Date defaultValue='2026-06-01' />
        <Field.TriggerIcon />
      </div>
      <Field.HelperText>Click the calendar icon to open the date picker.</Field.HelperText>
    </Field.Root>
  ),
  play: opensAtField,
};

export const DateTimeWithPicker: Story = {
  render: () => (
    <Field.Root>
      <Field.Label>Date & time (with picker)</Field.Label>
      <div className='flex items-center gap-1'>
        <Field.DateTime defaultValue='2026-06-01T15:30' />
        <Field.TriggerIcon />
      </div>
      <Field.HelperText>Click the calendar icon to open the date picker.</Field.HelperText>
    </Field.Root>
  ),
  play: opensAtField,
};
