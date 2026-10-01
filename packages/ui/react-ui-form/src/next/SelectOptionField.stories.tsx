//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Format } from '@dxos/echo';
import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';

import { type FormFieldMap } from '#types';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { SelectOptionField } from './fields/index.ts';
import { Form } from './Form.tsx';

const OptionsSchema = Schema.Struct({
  options: Schema.optional(Schema.Array(Format.SelectOption).annotate({ title: 'Options' })),
}).mapFields(Struct.map(Schema.mutableKey));

type Values = Schema.Schema.Type<typeof OptionsSchema>;

// A select property's option editor is a renderer the form is given (as FieldEditor gives it), so it owns its row.
const fieldMap: FormFieldMap = {
  options: (props) => (
    <Form.Field label={props.label} standalone>
      <SelectOptionField {...props} />
    </Form.Field>
  ),
};

const DefaultStory = (_: PaneArgs) => {
  const [values, setValues] = useState<Values>({
    options: [
      { id: 'a', title: 'Alpha', color: 'emerald' },
      { id: 'b', title: 'Beta', color: 'sky' },
    ],
  });
  return (
    <Next.Panel.Root>
      <Next.Panel.Body>
        <Form.Root
          schema={OptionsSchema}
          values={values}
          fieldMap={fieldMap}
          onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
        >
          <Form.Content>
            <Form.Fields />
          </Form.Content>
        </Form.Root>
      </Next.Panel.Body>
      <Next.Panel.Footer>
        <Next.Typography truncate data-testid='values'>
          {JSON.stringify(values)}
        </Next.Typography>
      </Next.Panel.Footer>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/next/SelectOptionField',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane()],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const readOptions = (canvasElement: HTMLElement): NonNullable<Values['options']> =>
  JSON.parse(within(canvasElement).getByTestId('values').textContent ?? '{}').options ?? [];

/** 1. Test: options show as hued tags; add opens a new option to edit; edit, recolour, reorder and remove. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    // 2. Each option is a list row whose disclosure shows its tag.
    const list = canvas.getByRole('list', { name: 'Options' });
    await expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    await expect(within(list).getByText('Alpha')).toBeVisible();

    // 3. Add appends an option opened for editing; typing names it.
    await userEvent.click(canvas.getByRole('button', { name: 'Add option' }));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(3));
    const label = await canvas.findByRole('textbox', { name: 'Label' });
    await userEvent.type(label, 'Gamma');
    await waitFor(() => expect(readOptions(canvasElement)[2].title).toBe('Gamma'));

    // 4. Its hue is a Select of swatches.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Color' }));
    await userEvent.click(await body.findByRole('option', { name: 'Rose' }));
    await waitFor(() => expect(readOptions(canvasElement)[2].color).toBe('rose'));

    // 5. Alt+ArrowDown on a handle reorders; the row's remove deletes.
    within(list).getAllByRole('button', { name: 'Drag to rearrange' })[0].focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(readOptions(canvasElement).map((option) => option.id)[1]).toBe('a'));
    await userEvent.click(within(list).getAllByRole('button', { name: 'Delete' })[0]);
    await waitFor(() => expect(readOptions(canvasElement)).toHaveLength(2));
  },
};
