//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Type } from '@dxos/echo';
import { type JsonSchemaType } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
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

  return (
    <div className='is-full bs-full grid grid-cols-2 divide-x divide-separator'>
      <TableComponent.Root>
        <TableComponent.Main
          model={orgModel}
          schema={DataType.Organization}
          presentation={orgPresentation}
          client={client}
          ignoreAttention
        />
      </TableComponent.Root>
      <TableComponent.Root>
        <TableComponent.Main
          model={contactModel}
          schema={DataType.Person}
          presentation={contactPresentation}
          client={client}
          ignoreAttention
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
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for both tables to load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get all dx-grid elements (should have 2 - one for each table)
    const grids = canvasElement.querySelectorAll('dx-grid');
    await expect(grids.length).toBe(2);

    // Focus on the second table (Person/contacts table)
    const secondGrid = grids[1];
    await expect(secondGrid).toBeVisible();

    // Wait for the grid to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Scroll to the relations column (column 4) - this mimics the scrollToColumn call
    const gridElement = secondGrid as any;
    if (gridElement.scrollToColumn) {
      gridElement.scrollToColumn(4);
    }

    // Wait for scroll to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Find and click the target cell (first row, relations column)
    const targetCell = secondGrid.querySelector('[data-dx-grid-plane="grid"] [aria-rowindex="0"][aria-colindex="4"]');
    await expect(targetCell).toBeTruthy();

    // Click to focus the cell
    await userEvent.click(targetCell as Element);

    // Wait a moment then press Enter to enter edit mode
    await new Promise((resolve) => setTimeout(resolve, 200));
    await userEvent.keyboard('{Enter}');

    // Wait for edit mode to activate
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Look for the combobox that should appear in edit mode
    const combobox = canvas.queryByRole('combobox');
    if (combobox) {
      await userEvent.click(combobox);

      // Wait for the search field to appear
      await new Promise((resolve) => setTimeout(resolve, 300));

      const searchField = canvas.queryByPlaceholderText('Search...');
      if (searchField) {
        await userEvent.click(searchField);

        // Get the first organization name from the first table to search for
        const firstGrid = grids[0];
        const orgCell = firstGrid.querySelector(
          '[data-dx-grid-plane="grid"] [aria-rowindex="0"][aria-colindex="0"] .dx-grid__cell__content',
        );

        if (orgCell?.textContent) {
          const orgName = orgCell.textContent;
          // Type the first 4 characters to search
          await userEvent.type(searchField, orgName.substring(0, 4));

          // Wait for search results
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Look for an option to select
          const option = canvas.queryByRole('option');
          if (option) {
            await expect(option).toBeVisible();

            // Press Enter to select
            await userEvent.keyboard('{Enter}');

            // Wait for selection to process
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Look for and click save button
            const saveButton = canvas.queryByTestId('save-button');
            if (saveButton) {
              await userEvent.click(saveButton);

              // Wait for save to complete
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Verify the relation was set (cell should now contain the org name)
              await expect(targetCell).toHaveTextContent(orgName.substring(0, 4));
            }
          }
        }
      }
    }
  },
};
