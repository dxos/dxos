//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import type * as Schema from 'effect/Schema';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Type } from '@dxos/echo';
import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';

import { type FormVariant } from '../components/Form/Form.theme.ts';
import { Form as CurrentForm } from '../components/Form/Form.tsx';
import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Person } from '../testing/schema.ts';
import { omitId } from '../util/index.ts';
import { Form } from './Form.tsx';
import { ArraySchema, SCALAR_VALUES, ScalarSchema, SettingsSchema } from './testing.ts';

type Entry = { schema: Schema.Codec<any, any, never, never>; values: Record<string, unknown> };

const SCHEMAS: Record<'person' | 'scalars' | 'arrays' | 'settings', Entry> = {
  person: { schema: omitId(Type.getSchema(Person)), values: { name: 'Alice', tasks: ['task 1', 'task 2'] } },
  scalars: { schema: ScalarSchema, values: SCALAR_VALUES },
  arrays: { schema: ArraySchema, values: { tags: ['red'], steps: ['Mix', 'Bake'] } },
  settings: { schema: SettingsSchema, values: { viewMode: 'preview', toolbar: true } },
};

type StoryArgs = PaneArgs & { schema: keyof typeof SCHEMAS; variant?: FormVariant };

/** The current Form (left) and the spike (right) on one schema and one set of values, for a human to compare. */
const DefaultStory = ({ schema: key, variant = 'default' }: StoryArgs) => {
  const { schema, values: initial } = SCHEMAS[key];
  const [values, setValues] = useState<Record<string, any>>(initial);
  const handleChange = (next: Record<string, any>) => setValues((previous) => ({ ...previous, ...next }));
  return (
    <Next.Panel.Root>
      <Next.Panel.Body layout='row' columns='minmax(0, 1fr) minmax(0, 1fr)' gap='md'>
        <CurrentForm.Root
          variant={variant}
          schema={schema}
          values={values}
          testId='current'
          onValuesChanged={handleChange}
        >
          <CurrentForm.Viewport>
            <CurrentForm.Content>
              <CurrentForm.Fields />
            </CurrentForm.Content>
          </CurrentForm.Viewport>
        </CurrentForm.Root>
        <Form.Root variant={variant} schema={schema} values={values} testId='next' onValuesChanged={handleChange}>
          {/* A row cell is one track, so the form starts its own template there. */}
          <Form.Viewport gutter='none'>
            <Form.Content>
              <Form.Fields />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/next/SideBySide',
  render: DefaultStory,
  args: { schema: 'scalars' },
  argTypes: { schema: { control: 'select', options: Object.keys(SCHEMAS) } },
  decorators: [withTheme(), withNextPane({ width: '64rem', height: '48rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Scalars: Story = {};

export const Person_: Story = { name: 'Person', args: { schema: 'person' } };

export const Arrays: Story = { args: { schema: 'arrays' } };

export const Settings: Story = { args: { schema: 'settings', variant: 'settings' } };

/** 1. Test: both forms render the same fields from one schema and share one set of values. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const current = within(canvas.getByTestId('current'));
    const next = within(canvas.getByTestId('next'));
    for (const name of ['Name', 'Notes']) {
      await expect(current.getByRole('textbox', { name })).toBeInTheDocument();
      await expect(next.getByRole('textbox', { name })).toBeInTheDocument();
    }

    // 2. An edit in the spike shows in the current form.
    const input = next.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Grace');
    await waitFor(() => expect(current.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace'));
  },
};
