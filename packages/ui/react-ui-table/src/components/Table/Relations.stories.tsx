//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Obj, Type } from '@dxos/echo';
import { type JsonSchemaType } from '@dxos/echo-schema';
import { type DxGrid } from '@dxos/lit-grid';
import '@dxos/lit-ui/dx-tag-picker.pcss';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { DataType } from '@dxos/schema';
import { type ValueGenerator, createAsyncGenerator } from '@dxos/schema/testing';

import { useTableModel } from '../../hooks';
import { type TableFeatures, TablePresentation, type TableRow } from '../../model';
import { translations } from '../../translations';
import { Table } from '../../types';

import { Table as TableComponent } from './Table';

faker.seed(1);
const generator: ValueGenerator = faker as any;

// TODO(burdon): Many-to-many relations.
// TODO(burdon): Mutable and immutable views.
// TODO(burdon): Reconcile schemas types and utils (see API PR).
// TODO(burdon): Base type for T (with id); see ECHO API PR?
const useTestModel = <S extends Type.Obj.Any>(schema: S, count: number) => {
  const client = useClient();
  const { space } = useClientProvider();
  const [view, setView] = useState<DataType.View>();
  const [jsonSchema, setJsonSchema] = useState<JsonSchemaType>();

  const features = useMemo<TableFeatures>(
    () => ({ schemaEditable: false, dataEditable: true, selection: { enabled: false } }),
    [],
  );

  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    const {
      jsonSchema,
      schema: effectSchema,
      view,
    } = await Table.makeView({ client, space, typename: Type.getTypename(schema) });
    setJsonSchema(jsonSchema);
    setView(view);
    space.db.add(view);
    await space.db.schemaRegistry.register([effectSchema]);
  }, [client, space, schema]);

  const model = useTableModel<TableRow>({ view, schema: jsonSchema, rows: [], features });

  useEffect(() => {
    if (!model || !space) {
      return;
    }

    const objectGenerator = createAsyncGenerator(generator, schema, { db: space?.db, force: true });
    void objectGenerator.createObjects(count).then((objects) => {
      model.setRows(objects);
    });
  }, [model, space]);

  const presentation = useMemo(() => {
    if (!model) {
      return;
    }

    return new TablePresentation(model);
  }, [model]);

  return { model, presentation };
};

const DefaultStory = () => {
  const client = useClient();
  const { model: orgModel, presentation: orgPresentation } = useTestModel(DataType.Organization, 50);
  const { model: contactModel, presentation: contactPresentation } = useTestModel(DataType.Person, 50);
  const { space } = useClientProvider();

  const handleCreate = useCallback(
    (schema: Schema.Schema.AnyNoContext, values: any) => {
      return client.spaces.default.db.add(Obj.make(schema, values));
    },
    [space],
  );

  return (
    <div className='is-full bs-full grid grid-cols-2 divide-x divide-separator'>
      <TableComponent.Root>
        <TableComponent.Main
          model={orgModel}
          schema={DataType.Organization}
          presentation={orgPresentation}
          onCreate={handleCreate}
          client={client}
          ignoreAttention
          testId='relations-0'
        />
      </TableComponent.Root>
      <TableComponent.Root>
        <TableComponent.Main
          model={contactModel}
          schema={DataType.Person}
          presentation={contactPresentation}
          onCreate={handleCreate}
          client={client}
          ignoreAttention
          testId='relations-1'
        />
      </TableComponent.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-table/Relations',
  render: DefaultStory,
  decorators: [
    withTheme,
    withClientProvider({
      types: [DataType.View, DataType.Organization, DataType.Person, Table.Table],
      createIdentity: true,
      createSpace: true,
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...formTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // Get all dx-grid elements (should have 2 - one for each table)
    const firstGrid = await canvas.findByTestId('relations-0', undefined, { timeout: 30_000 });
    const secondGrid = await canvas.findByTestId('relations-1', undefined, { timeout: 30_000 });

    // Focus on the second table (Person/contacts table)
    await expect(secondGrid).toBeVisible();

    // Scroll to the relations column (column 4) - this mimics the scrollToColumn call
    (secondGrid.closest('dx-grid') as DxGrid).scrollToColumn(4);

    // Wait for scroll to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Find and click the target cell (first row, relations column)
    const targetCell = secondGrid.querySelector('[data-dx-grid-plane="grid"] [aria-rowindex="0"][aria-colindex="4"]');
    await expect(targetCell).toBeVisible();

    // Click to focus the cell
    await userEvent.click(targetCell as HTMLElement);
    await expect(targetCell).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    // Look for the combobox that should appear in edit mode
    const combobox = await body.findByRole('combobox', undefined, { timeout: 5000 });
    await userEvent.click(combobox);

    const searchField = await body.findByPlaceholderText('Search…');
    await userEvent.click(searchField);

    // Get the first organization name from the first table to search for
    const orgCell = firstGrid.querySelector(
      '[data-dx-grid-plane="grid"] [aria-rowindex="0"][aria-colindex="0"] .dx-grid__cell__content',
    ) as HTMLElement;

    const orgName = orgCell.textContent;
    // Type the first 4 characters to search
    await userEvent.type(searchField, orgName.substring(0, 4));

    // Look for an option to select
    const option = await body.findAllByRole('option');
    await expect(option[0]).toBeVisible();

    // Press Enter to select
    await userEvent.keyboard('{Enter}');

    // Look for and click save button
    const saveButton = await body.findByTestId('save-button');
    await userEvent.click(saveButton);

    // Verify the relation was set (cell should now contain the org name)
    await expect(targetCell).toHaveTextContent(orgName.substring(0, 4));

    // Test object creation (new relations) - equivalent to "new relations work as expected" test
    // Find a different cell to test object creation (second row, relations column)
    const newTargetCell = secondGrid.querySelector(
      '[data-dx-grid-plane="grid"] [aria-rowindex="1"][aria-colindex="4"]',
    );
    await expect(newTargetCell).toBeTruthy();

    // Click to focus the cell
    await userEvent.click(newTargetCell as Element);

    await userEvent.keyboard('{Enter}');

    // Look for the combobox that should appear in edit mode
    const newCombobox = await body.findByRole('combobox');
    await userEvent.click(newCombobox);

    const newSearchField = await body.findByPlaceholderText('Search…');
    await userEvent.click(newSearchField);

    // Type a new object name (this will create a new object)
    const newOrgName = 'Salieri LLC';
    await userEvent.type(newSearchField, newOrgName);

    // Look for an option to select (should be the create new option)
    const newOption = await body.findAllByRole('option');
    await expect(newOption[0]).toBeVisible();

    // Press Enter to select/create
    await userEvent.keyboard('{Enter}');

    // Look for and click save button
    const createReferencedObjectForm = await body.findByTestId('create-referenced-object-form');
    const saveObjectButton = await within(createReferencedObjectForm).findByTestId('save-button');
    await userEvent.click(saveObjectButton);

    // Verify the new object was created and relation was set
    await expect(newTargetCell).toHaveTextContent(newOrgName);
  },
};
