//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';

import { type RefOption } from '#types';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Form } from './Form.tsx';
import { RefSchema } from './testing.ts';

const SPACE_ID = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';

/** Candidate objects as `getOptions` would map them; no database is needed to exercise the picker. */
const OPTIONS: RefOption[] = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli'].map((label, index) => ({
  id: `echo://${SPACE_ID}/01J00J9B45YHYSGZQTQMSKMGJ${index}`,
  label,
}));

const getOptions = () => OPTIONS;

/** A single reference on `Next.Combobox` in input mode (the text input is the trigger). */
const DefaultStory = (_: PaneArgs) => {
  const [values, setValues] = useState({});
  return (
    <Next.Panel.Root size='sm'>
      <Next.Panel.Body>
        <Form.Root
          schema={RefSchema}
          values={values}
          getOptions={getOptions}
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
  title: 'ui/react-ui-form/next/RefField',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ height: '24rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 1. Test: typing narrows the candidates, Enter picks the first, the value is a Ref, and clearing unsets it. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    // 2. The input is named by the field's label.
    const input = canvas.getByRole('combobox', { name: 'Employer' });
    await userEvent.type(input, 'ini');
    const listbox = await body.findByRole('listbox');
    await expect(within(listbox).getAllByRole('option')).toHaveLength(1);

    // 3. Enter picks the highlighted match and writes a reference to it.
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvas.getByTestId('values')).toHaveTextContent(OPTIONS[2].id));
    await expect(input).toHaveValue('Initech');

    // 4. The popup took the row's size from the panel (Phase 4 decision 2).
    await userEvent.click(canvas.getByRole('button', { name: /open/i }));
    const popup = (await body.findByRole('listbox')).closest('[data-size]');
    await expect(popup).toHaveAttribute('data-size', 'sm');
    await userEvent.keyboard('{Escape}');

    // 5. The clear trigger unsets the reference.
    await userEvent.click(canvas.getByRole('button', { name: /clear/i }));
    await waitFor(() => expect(canvas.getByTestId('values')).not.toHaveTextContent('echo://'));
  },
};
