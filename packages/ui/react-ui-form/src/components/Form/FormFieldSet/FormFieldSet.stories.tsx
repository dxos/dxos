//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Form } from '../Form';
import { type FormVariant } from '../Form.theme';

// A nested struct is a group: the form renders it as a collapsible fieldset named by its title.
const ContactSchema = Schema.Struct({
  name: Schema.String.annotate({ title: 'Name' }),
  address: Schema.Struct({
    street: Schema.String.annotate({ title: 'Street' }),
    city: Schema.String.annotate({ title: 'City' }),
  }).annotate({ title: 'Address' }),
}).mapFields(Struct.map(Schema.mutableKey));

type Contact = Schema.Schema.Type<typeof ContactSchema>;

type StoryArgs = {
  variant: FormVariant;
};

/**
 * Every group in a form is a `<fieldset>` named by its `<legend>`: the section by its title, a
 * nested object by its label, so assistive technology announces the group on entering it, and a
 * nested group folds behind a disclosure in its legend.
 */
const DefaultStory = ({ variant }: StoryArgs) => {
  const [values, setValues] = useState<Partial<Contact>>({
    name: 'Ada',
    address: { street: '1 Main St', city: 'Springfield' },
  });
  return (
    <Form.Root schema={ContactSchema} values={values} variant={variant} onValuesChanged={setValues}>
      <Form.Viewport>
        <Form.Content>
          <Form.Section title='Contact' description='Where to reach them.'>
            <Form.FieldSet />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/FormFieldSet',
  component: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered', translations },
  args: { variant: 'default' },
  argTypes: { variant: { control: 'select', options: ['default', 'settings'] } },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const groupsAreFieldsets = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);

  // The section is a fieldset named by its title and described by its description.
  const section = canvas.getByRole('group', { name: 'Contact' });
  await expect(section.tagName).toBe('FIELDSET');
  await expect(section).toHaveTextContent('Where to reach them.');

  // The nested object is a fieldset of its own, named by its legend, inside the section.
  const address = canvas.getByRole('group', { name: 'Address' });
  await expect(address.tagName).toBe('FIELDSET');
  await expect(section.contains(address)).toBe(true);
  await expect(within(address).getByLabelText('Street')).toHaveValue('1 Main St');

  // Its legend holds the disclosure, which hides and restores the fields.
  const trigger = within(address).getByRole('button', { name: 'Address' });
  await expect(trigger.closest('legend')).not.toBeNull();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await userEvent.click(trigger);
  // `aria-expanded` follows the content's visibility, which lags the state by the collapse animation.
  const content = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
  await expect(content).not.toBeNull();
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
  await waitFor(() => expect(content).toHaveAttribute('hidden'));
  await userEvent.click(trigger);
  await waitFor(() => expect(content).not.toHaveAttribute('hidden'));
  await expect(within(address).getByLabelText('City')).toHaveValue('Springfield');
};

export const Default: Story = {
  play: async ({ canvasElement }) => groupsAreFieldsets(canvasElement),
};

export const Settings: Story = {
  args: { variant: 'settings' },
  play: async ({ canvasElement }) => groupsAreFieldsets(canvasElement),
};
