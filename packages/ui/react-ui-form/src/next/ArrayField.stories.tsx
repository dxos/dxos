//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Form } from './Form.tsx';
import { ArraySchema, type ArrayValues } from './testing.ts';

const INITIAL: ArrayValues = {
  tags: ['red', 'green'],
  steps: ['Mix', 'Bake', 'Cool'],
  contacts: [{ kind: 'email', value: 'ada@example.com' }],
};

/** Arrays on `@dxos/react-ui-list/next` OrderedList: add, remove, and keyboard reorder for an ordered array. */
const DefaultStory = (_: PaneArgs) => {
  const [values, setValues] = useState<ArrayValues>(INITIAL);
  return (
    <Next.Panel.Root>
      <Next.Panel.Body>
        <Form.Root
          schema={ArraySchema}
          values={values}
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
  title: 'ui/react-ui-form/next/ArrayField',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane()],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const readValues = (canvasElement: HTMLElement): ArrayValues =>
  JSON.parse(within(canvasElement).getByTestId('values').textContent ?? '{}');

/** 1. Test: add, edit, remove, and reorder from the keyboard. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 2. Each array is a named list; only the ordered one has drag handles.
    const tags = canvas.getByRole('list', { name: 'Tags' });
    const steps = canvas.getByRole('list', { name: 'Steps' });
    await expect(within(tags).getAllByRole('listitem')).toHaveLength(2);
    await expect(within(tags).queryAllByRole('button', { name: 'Drag to rearrange' })).toHaveLength(0);
    await expect(within(steps).getAllByRole('button', { name: 'Drag to rearrange' })).toHaveLength(3);

    // 3. Add appends an empty item whose input takes the typed text.
    await userEvent.click(canvas.getByTestId('tags.add'));
    await waitFor(() => expect(within(tags).getAllByRole('listitem')).toHaveLength(3));
    const inputs = within(tags).getAllByRole('textbox');
    await userEvent.type(inputs[2], 'blue');
    await waitFor(() => expect(readValues(canvasElement).tags).toEqual(['red', 'green', 'blue']));

    // 4. Remove deletes that row's value.
    await userEvent.click(within(tags).getAllByRole('button', { name: 'Delete item' })[0]);
    await waitFor(() => expect(readValues(canvasElement).tags).toEqual(['green', 'blue']));

    // 5. Alt+ArrowDown on a drag handle moves the row down.
    within(steps).getAllByRole('button', { name: 'Drag to rearrange' })[0].focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(readValues(canvasElement).steps).toEqual(['Bake', 'Mix', 'Cool']));

    // 6. Rows share the form's content track: an item's input starts where a label does.
    const label = canvas.getByText('Kind', { selector: 'label' }).getBoundingClientRect();
    const handle = within(steps).getAllByRole('button', { name: 'Drag to rearrange' })[0].getBoundingClientRect();
    await expect(handle.left).toBeGreaterThanOrEqual(label.left - 1);

    // 7. An object item renders its fields as a nested set.
    await expect(canvas.getByRole('textbox', { name: 'Value' })).toHaveValue('ada@example.com');
  },
};
