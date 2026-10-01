//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { type ChangeEvent, useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';

import { type FormFieldMap } from '#types';

import { Form as CurrentForm } from '../components/Form/Form.tsx';
import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Form } from './Form.tsx';

const SpaceFormSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
}).mapFields(Struct.map(Schema.mutableKey));

// plugin-space `SpaceSettingsContainer`'s `name` renderer, as it is today (translations inlined).
const currentFieldMap: FormFieldMap = {
  name: ({ type, label, getValue, onValueChange }) => {
    const handleChange = useCallback(
      ({ target: { value } }: ChangeEvent<HTMLInputElement>) => onValueChange(type, value),
      [onValueChange, type],
    );
    return (
      <CurrentForm.Field label={label} description='The name shown for this space.'>
        <Next.Input value={getValue()} onChange={handleChange} placeholder='Space name' />
      </CurrentForm.Field>
    );
  },
};

// The same renderer migrated: `Form` from `react-ui-form/next`, the control a `Next.Input`, and the width class gone.
const nextFieldMap: FormFieldMap = {
  name: ({ type, label, getValue, onValueChange }) => {
    const handleChange = useCallback(
      ({ target: { value } }: ChangeEvent<HTMLInputElement>) => onValueChange(type, value),
      [onValueChange, type],
    );
    return (
      <Form.Field label={label} description='The name shown for this space.'>
        <Next.Input value={getValue() ?? ''} onChange={handleChange} placeholder='Space name' />
      </Form.Field>
    );
  },
};

/** A plugin `fieldMap` renderer before and after migration, each in its form's settings variant. */
const DefaultStory = (_: PaneArgs) => {
  const [values, setValues] = useState({ name: 'Research' });
  return (
    <Next.Panel.Root>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root>
          <Next.ScrollArea.Viewport asChild>
            <Next.Container gutter='rail' layout='row' align='start' columns='minmax(0, 1fr) minmax(0, 1fr)'>
              <CurrentForm.Root
                variant='settings'
                schema={SpaceFormSchema}
                values={values}
                fieldMap={currentFieldMap}
                testId='current'
                onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
              >
                <CurrentForm.Viewport>
                  <CurrentForm.Content>
                    <CurrentForm.Fields />
                  </CurrentForm.Content>
                </CurrentForm.Viewport>
              </CurrentForm.Root>
              <Form.Root
                variant='settings'
                schema={SpaceFormSchema}
                values={values}
                fieldMap={nextFieldMap}
                testId='next'
                onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
              >
                {/* A row cell is one track, so the form starts its own template there. */}
                <Form.Viewport gutter='none'>
                  <Form.Content>
                    <Form.Fields />
                  </Form.Content>
                </Form.Viewport>
              </Form.Root>
            </Next.Container>
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/next/CustomRenderer',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ width: '56rem', height: '16rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 1. Test: the migrated renderer owns a Next row, labelled and described, and writes the shared value. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const next = within(canvas.getByTestId('next'));
    const input = next.getByRole('textbox', { name: 'Name' });
    await expect(input.closest('[data-scope="field"][data-part="root"]')).toHaveAttribute('data-layout', 'row');
    await expect(next.getByText('The name shown for this space.')).toBeVisible();

    // 2. Both forms show the same value, so typing in the migrated one updates the current one.
    await userEvent.clear(input);
    await userEvent.type(input, 'Lab');
    await waitFor(() => expect(within(canvas.getByTestId('current')).getByRole('textbox')).toHaveValue('Lab'));
  },
};
