//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Button, Field } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type FormPresentation } from '#types';

import { type FormVariant } from '../Form.theme';
import { Form } from '../Form.tsx';
import { useFormField } from './FormFieldContext.ts';

const ProfileSchema = Schema.Struct({
  name: Schema.String.annotate({ title: 'Name', description: 'How you are known.' }),
  hue: Schema.optional(Schema.String.annotate({ title: 'Hue', description: 'Your colour.' })),
  newsletter: Schema.optional(Schema.Boolean.annotate({ title: 'Newsletter', description: 'Monthly, no more.' })),
}).mapFields(Struct.map(Schema.mutableKey));

type Profile = Schema.Schema.Type<typeof ProfileSchema>;

/** A hand-written control inside a bound row reads the binding rather than taking props. */
const HueControl = () => {
  const { value, setValue } = useFormField<string>();
  return <Field.Input placeholder='A hue' value={value ?? ''} onChange={(event) => setValue(event.target.value)} />;
};

type StoryArgs = {
  variant: FormVariant;
  presentation?: FormPresentation;
  readonly?: boolean;
};

/**
 * `Form.Field` is the leaf, always a real field. With `path` it is bound: label, description, value
 * and error come from the schema and the model, and with no children the dispatcher picks the
 * control. Without `path` it takes its label and description as props and its children as the control.
 */
const DefaultStory = ({ variant, presentation, readonly }: StoryArgs) => {
  const [values, setValues] = useState<Partial<Profile>>({ name: 'Ada', newsletter: true });
  const [notifications, setNotifications] = useState(true);
  return (
    <Form.Root
      schema={ProfileSchema}
      values={values}
      variant={variant}
      layout={presentation}
      readonly={readonly}
      onValuesChanged={setValues}
    >
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet label='Profile'>
            <Form.Field path='name' />
            <Form.Field path='hue'>
              <HueControl />
            </Form.Field>
            <Form.Field path='newsletter' />
          </Form.FieldSet>
          <Form.FieldSet label='Settings'>
            <Form.Field label='Notifications' description='Tell me when something changes.' labelPlacement='beside'>
              <Field.Switch checked={notifications} onCheckedChange={setNotifications} />
            </Form.Field>
            <Form.Field standalone label='Danger zone' description='There is no undo.'>
              <Button>Delete everything</Button>
            </Form.Field>
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/FormField',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
  args: { variant: 'default' },
  argTypes: {
    variant: { control: 'select', options: ['default', 'settings'] },
    presentation: { control: 'select', options: ['full', 'compact', 'inline', 'static'] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** In the default variant a toggle's text sits right of it on the same line; the settings card keeps its label column. */
const labelBesideToggle = (canvas: ReturnType<typeof within>, name: string, beside: boolean) => {
  const input = canvas.getByLabelText(name).getBoundingClientRect();
  const label = canvas.getByText(name).getBoundingClientRect();
  const sameLine = Math.abs(label.top + label.height / 2 - (input.top + input.height / 2)) < 8;
  return expect(sameLine && label.left >= input.right).toBe(beside);
};

const rowsAreFields = async (canvasElement: HTMLElement, variant: FormVariant) => {
  const canvas = within(canvasElement);

  // Bound: the label and value come from the schema and the model; the dispatcher picked the input.
  const name = canvas.getByLabelText('Name');
  await expect(name).toHaveValue('Ada');
  await userEvent.clear(name);
  await userEvent.type(name, 'Grace');
  await expect(name).toHaveValue('Grace');

  // Bound, hand-written control: labelled by the row, edits through the binding.
  const hue = canvas.getByLabelText('Hue');
  await userEvent.type(hue, 'teal');
  await expect(hue).toHaveValue('teal');

  // Unbound: the caller's switch is labelled by the row's label all the same (the label resolves to
  // the switch's input), and clicking the label toggles it.
  const notifications = canvas.getByLabelText('Notifications');
  await expect(notifications).toHaveAttribute('type', 'checkbox');
  await expect(notifications).toBeChecked();
  await userEvent.click(canvas.getByText('Notifications'));
  await expect(notifications).not.toBeChecked();

  // A schema boolean is a toggle beside its text in the default variant and a settings row otherwise.
  await expect(canvas.getByLabelText('Newsletter')).toBeChecked();
  await labelBesideToggle(canvas, 'Newsletter', variant === 'default');
  await labelBesideToggle(canvas, 'Notifications', variant === 'default');

  // Standalone: the button keeps its own name; the row's label names nothing.
  await expect(canvas.getByRole('button', { name: 'Delete everything' })).toBeVisible();
  await expect(canvas.queryByLabelText('Danger zone')).toBeNull();
};

export const Default: Story = {
  play: async ({ canvasElement }) => rowsAreFields(canvasElement, 'default'),
};

export const Settings: Story = {
  args: { variant: 'settings' },
  play: async ({ canvasElement }) => rowsAreFields(canvasElement, 'settings'),
};

export const Compact: Story = {
  args: { presentation: 'compact' },
};

export const Inline: Story = {
  args: { presentation: 'inline' },
};

export const Static: Story = {
  args: { presentation: 'static' },
};
