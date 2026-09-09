//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { useState } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Button, Field } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Form } from '../Form';
import { type FormVariant } from '../Form.theme';

// A nested struct is a group: the walker renders it as a collapsible field set named by its title.
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
 * `Form.FieldSet` is the one grouping element and binds nothing: the same `<fieldset>` named by its
 * legend holds a schema walk, hand-written rows, or another field set. Depth decides its chrome.
 */
const DefaultStory = ({ variant }: StoryArgs) => {
  const [values, setValues] = useState<Partial<Contact>>({
    name: 'Ada',
    address: { street: '1 Main St', city: 'Springfield' },
  });
  const [wireframe, setWireframe] = useState(false);
  return (
    <Form.Root schema={ContactSchema} values={values} variant={variant} onValuesChanged={setValues}>
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet label='Contact' description='Where to reach them.'>
            <Form.Fields />
          </Form.FieldSet>
          <Form.FieldSet label='Options' description='Layout switches.' descriptionPlacement='tooltip'>
            <Form.Field label='Wireframe' description='Outline every surface.'>
              <Field.Switch checked={wireframe} onCheckedChange={setWireframe} />
            </Form.Field>
            <Form.Field standalone label='Reset' description='Forget the layout.'>
              <Button>Reset</Button>
            </Form.Field>
          </Form.FieldSet>
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

  // A top-level field set is named by its title and described by its description.
  const section = canvas.getByRole('group', { name: 'Contact' });
  await expect(section.tagName).toBe('FIELDSET');
  await expect(section).toHaveTextContent('Where to reach them.');

  // The walker renders the nested object as a field set of its own, named by its legend, inside the section.
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

  // A hand-written field set holds the same rows: the switch is labelled by its row, the button row is not a label.
  const options = canvas.getByRole('group', { name: 'Options' });
  // Its description is a tooltip on the label, not helper text in the group.
  await expect(options).not.toHaveTextContent('Layout switches.');
  const hint = within(options).getByRole('button', { name: 'Layout switches.' });
  await userEvent.hover(hint);
  await expect(await screen.findByRole('tooltip', undefined, { timeout: 5_000 })).toHaveTextContent('Layout switches.');
  await userEvent.unhover(hint);
  await expect(within(options).getByLabelText('Wireframe')).toHaveAttribute('type', 'checkbox');
  await expect(within(options).getByRole('button', { name: 'Reset' })).toBeVisible();
  await expect(within(options).queryByLabelText('Reset')).toBeNull();
};

export const Default: Story = {
  play: async ({ canvasElement }) => groupsAreFieldsets(canvasElement),
};

export const Settings: Story = {
  args: { variant: 'settings' },
  play: async ({ canvasElement }) => groupsAreFieldsets(canvasElement),
};

/** A walk at the form's root, with no field set around it: the nested object is still a nested group. */
export const RootFields: Story = {
  render: () => {
    const [values, setValues] = useState<Partial<Contact>>({
      name: 'Ada',
      address: { street: '1 Main St', city: 'Springfield' },
    });
    return (
      <Form.Root schema={ContactSchema} values={values} onValuesChanged={setValues}>
        <Form.Viewport>
          <Form.Content>
            <Form.Fields />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const address = canvas.getByRole('group', { name: 'Address' });
    const trigger = within(address).getByRole('button', { name: 'Address' });
    // Nested chrome: the legend is not a heading, and the body is boxed.
    await expect(within(address).queryByRole('heading')).toBeNull();
    const body = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    await expect(body?.className).toContain('border');
  },
};
