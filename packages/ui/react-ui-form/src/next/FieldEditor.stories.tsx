//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Filter, Query, Type } from '@dxos/echo';
import { createEchoSchema } from '@dxos/echo/testing';
import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';
import { ProjectionModel, ViewModel, createEchoChangeCallback } from '@dxos/schema';
import { Example } from '@dxos/schema/testing';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { FieldEditor } from './FieldEditor.tsx';

// The story's projection, so the play test can read what a save wrote.
const current: { projection?: ProjectionModel } = {};

const DefaultStory = (_: PaneArgs) => {
  const { view, projection } = useMemo(() => {
    const schema = createEchoSchema(Type.getSchema(Example));
    const view = ViewModel.make({
      name: 'Test',
      query: Query.select(Filter.type(Example)),
      jsonSchema: schema.jsonSchema,
    });
    const projection = new ProjectionModel({
      view,
      baseSchema: schema.jsonSchema,
      change: createEchoChangeCallback(view, schema),
    });
    projection.normalizeView();
    return { view, projection };
  }, []);
  current.projection = projection;

  return (
    <Next.Panel.Root>
      <Next.Panel.Body>
        <FieldEditor projection={projection} field={view.projection.fields[0]} onSave={() => {}} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/next/FieldEditor',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane()],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 1. Test: changing a field's format and saving writes the new type to the projection's schema. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    // 2. The format is a Select showing the field's current format.
    const format = canvas.getByRole('combobox', { name: 'Type format' });
    await expect(format).toHaveTextContent('String');
    await userEvent.click(format);
    await userEvent.click(await body.findByRole('option', { name: 'Number' }));
    await waitFor(() => expect(canvas.getByRole('combobox', { name: 'Type format' })).toHaveTextContent('Number'));

    // 3. Save writes the type and format, keeping the description.
    await userEvent.click(canvas.getByTestId('save-button'));
    await waitFor(() => expect(current.projection?.baseSchema.properties?.name.type).toBe('number'));
    await expect(current.projection?.baseSchema.properties?.name.format).toBe('number');
    await expect(current.projection?.baseSchema.properties?.name.description).toBe('Full name.');
  },
};
