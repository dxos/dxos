//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DXN, Filter, JsonSchema, Query, Type, type View } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Format } from '@dxos/echo/Format';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';
import { type ProjectionModel, ViewModel } from '@dxos/schema';
import { Organization } from '@dxos/types';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { ViewEditor } from './ViewEditor.tsx';

const TestSchema = Schema.Struct({
  name: Schema.String,
  email: Format.Email,
  salary: Format.Currency(),
}).pipe(Type.makeObject(DXN.make('com.example.type.test', '0.1.0')));

type StoryArgs = PaneArgs & { system?: boolean };

/** A view over a database type (editable schema), or with `system` over a static one (read-only schema). */
const DefaultStory = ({ system }: StoryArgs) => {
  const { space } = useClientStory();
  const [type, setType] = useState<Type.AnyEntity>();
  const [view, setView] = useState<View.View>();
  const projectionRef = useRef<ProjectionModel>(null);
  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    const type = system ? Organization.Organization : await space.db.addType(TestSchema);
    const schema = system ? Organization.Organization : TestSchema;
    // An updater: a type is a class, which `setType` would otherwise call as one.
    setType(() => type);
    setView(
      ViewModel.make({
        name: 'Test',
        query: Query.select(Filter.type(schema)),
        jsonSchema: JsonSchema.toJsonSchema(schema),
      }),
    );
  }, [space, system]);

  const [snapshot] = useObject(view);
  if (!type || !view) {
    return <></>;
  }

  return (
    <Next.Panel.Root size='sm'>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root>
          <Next.ScrollArea.Viewport asChild>
            <Next.Container gutter='rail'>
              <ViewEditor
                ref={projectionRef}
                type={type}
                view={view}
                registry={space?.db.graph.registry}
                db={space?.db}
                onDelete={(fieldId) => projectionRef.current?.deleteFieldProjection(fieldId)}
              />
            </Next.Container>
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
      <Next.Panel.Footer>
        <Next.Typography truncate data-testid='fields'>
          {JSON.stringify(
            snapshot?.projection.fields.map((field) => (field.visible === false ? `-${field.path}` : field.path)),
          )}
        </Next.Typography>
      </Next.Panel.Footer>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/next/ViewEditor',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ height: '40rem' }), withClientProvider({ createSpace: true })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const System: Story = { args: { system: true } };

const readFields = (canvasElement: HTMLElement): string[] =>
  JSON.parse(within(canvasElement).getByTestId('fields').textContent || '[]');

/** 1. Test: the fields list hides, shows, reorders, deletes and adds field projections. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 2. A database type's schema is editable, so no banner; each projection is a row of the Fields listbox.
    const list = await canvas.findByRole('listbox', { name: 'Fields' }, { timeout: 15_000 });
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(within(list).getAllByRole('option')).toHaveLength(3);
    await expect(readFields(canvasElement)).toEqual(['name', 'email', 'salary']);

    // 3. The eye toggle hides a field (its path in the description tone) and shows it again.
    await userEvent.click(within(list).getAllByTestId('hide-field-button')[1]);
    await waitFor(() => expect(readFields(canvasElement)).toContain('-email'));
    await userEvent.click(within(list).getByTestId('show-field-button'));
    await waitFor(() => expect(readFields(canvasElement)).toEqual(['name', 'email', 'salary']));

    // 4. Alt+ArrowDown on a handle moves the field down.
    within(list).getAllByRole('button', { name: 'Drag to rearrange' })[0].focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(readFields(canvasElement)).toEqual(['email', 'name', 'salary']));

    // 5. Delete removes a projection; add creates one and opens its FieldEditor.
    await userEvent.click(within(list).getAllByTestId('field.delete')[2]);
    await waitFor(() => expect(readFields(canvasElement)).toEqual(['email', 'name']));
    await userEvent.click(canvas.getByRole('button', { name: 'Add property' }));
    await waitFor(() => expect(within(list).getAllByRole('option')).toHaveLength(3));
    await expect(await canvas.findByRole('combobox', { name: 'Format' })).toBeVisible();
  },
};

/** 1. TestSystem: a static type's schema is read-only, which a banner announces and the rows' delete reflects. */
export const TestSystem: Story = {
  args: { system: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const banner = await canvas.findByRole('alert', {}, { timeout: 15_000 });
    await expect(banner).toBeVisible();
    const list = canvas.getByRole('listbox', { name: 'Fields' });
    for (const remove of within(list).getAllByTestId('field.delete')) {
      await expect(remove).toBeDisabled();
    }
  },
};
