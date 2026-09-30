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
import { createSelectField } from './fields/index.ts';
import { SCALAR_VALUES, ScalarSchema, type ScalarValues } from './testing.ts';

const fieldMap = { model: createSelectField({ options: ['opus', 'sonnet', 'haiku'] }) };

type StoryArgs = PaneArgs & { size?: Next.PanelRootProps['size'] };

/** Same contract as the current Form: schema, values, onValuesChanged, onSave/onCancel, fieldMap, test ids. */
const DefaultStory = ({ size = 'md' }: StoryArgs) => {
  const [values, setValues] = useState<ScalarValues>(SCALAR_VALUES);
  const [saved, setSaved] = useState(false);
  return (
    <Next.Panel.Root size={size}>
      <Next.Panel.Body>
        <Form.Root
          schema={ScalarSchema}
          values={values}
          fieldMap={fieldMap}
          testId='scalars'
          onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
          onSave={() => setSaved(true)}
          onCancel={() => setValues(SCALAR_VALUES)}
        >
          <Form.Content>
            <Form.Fields />
            <Form.ErrorText>{saved ? undefined : 'Not saved yet.'}</Form.ErrorText>
            <Form.Actions />
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
  title: 'ui/react-ui-form/next/Form',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ height: '48rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const readValues = (canvasElement: HTMLElement): Record<string, unknown> =>
  JSON.parse(within(canvasElement).getByTestId('values').textContent ?? '{}');

/** 1. Test: every scalar renderer is a named control that writes the form values, and the contract's test ids work. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    // 2. Text: typing writes through onValuesChanged.
    const name = canvas.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Grace');
    await waitFor(() => expect(readValues(canvasElement).name).toBe('Grace'));

    // 3. A cleared required field is invalid once touched; the header carries the error mark.
    await userEvent.clear(name);
    await userEvent.tab();
    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'));
    await userEvent.type(name, 'Grace');
    await waitFor(() => expect(name).not.toHaveAttribute('aria-invalid', 'true'));

    // 4. Number: Ark's spinbutton; ArrowUp steps the integer.
    const age = canvas.getByRole('spinbutton', { name: 'Age' });
    await userEvent.click(age);
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(readValues(canvasElement).age).toBe(37));

    // 5. Boolean: a Switch labelled by the field (beside placement).
    await userEvent.click(canvas.getByRole('switch', { name: 'Active' }));
    await waitFor(() => expect(readValues(canvasElement).active).toBe(true));

    // 6. Select over literals, labelled through the Field; the value maps back to the literal.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Status' }));
    await userEvent.click(await body.findByRole('option', { name: 'archived' }));
    await waitFor(() => expect(readValues(canvasElement).status).toBe('archived'));

    // 7. createSelectField from a fieldMap: the renderer owns its row, on Next.Select.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Model' }));
    await userEvent.click(await body.findByRole('option', { name: 'sonnet' }));
    await waitFor(() => expect(readValues(canvasElement).model).toBe('sonnet'));

    // 8. Textarea and password.
    await userEvent.type(canvas.getByRole('textbox', { name: 'Notes' }), 'Hello');
    await userEvent.type(canvas.getByLabelText('Secret'), 'pw');
    await waitFor(() => expect(readValues(canvasElement)).toMatchObject({ notes: 'Hello', secret: 'pw' }));

    // 9. Dates: segmented DateInputs named by their field labels.
    await expect(canvas.getByRole('group', { name: 'Birthday' })).toBeInTheDocument();
    await expect(canvas.getByRole('group', { name: 'Next meeting' })).toBeInTheDocument();
    await expect(canvas.getByRole('group', { name: 'Reminder' })).toBeInTheDocument();

    // 10. Geo point: two labelled coordinates in one standalone row.
    const latitude = canvas.getByRole('spinbutton', { name: 'Latitude' });
    await expect(latitude).toHaveValue(51.5072);
    await expect(canvas.getByRole('spinbutton', { name: 'Longitude' })).toHaveValue(-0.1276);

    // 11. Test ids: form.error until saved; save and cancel buttons; the form's testId on Content.
    await expect(canvas.getByTestId('scalars')).toHaveAttribute('role', 'form');
    await expect(canvas.getByTestId('form.error')).toHaveTextContent('Not saved yet.');
    await expect(canvas.getByTestId('cancel-button')).toBeInTheDocument();
    await userEvent.click(canvas.getByTestId('save-button'));
    await waitFor(() => expect(canvas.queryByTestId('form.error')).toBeNull());
  },
};
