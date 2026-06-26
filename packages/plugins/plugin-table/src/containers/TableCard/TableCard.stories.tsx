//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Type, View } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { random } from '@dxos/random';
import { withClientProvider } from '@dxos/react-client/testing';
import { CardContainer } from '@dxos/react-ui-mosaic/testing';
import { useTestTableModel } from '@dxos/react-ui-table/testing';
import { translations as tableTranslations } from '@dxos/react-ui-table/translations';
import { Table } from '@dxos/react-ui-table/types';
import { withTheme } from '@dxos/react-ui/testing';
import { ViewModel, getSchemaFromPropertyDefinitions } from '@dxos/schema';

import { translations } from '#translations';

import { TableCard } from './TableCard';

random.seed(1234);

const DefaultStory = () => {
  const { schema, table } = useTestTableModel();
  if (!schema || !table) {
    return <div />;
  }

  return (
    <CardContainer icon='ph--text-aa--regular'>
      <TableCard role='card--content' subject={table} />
    </CardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-table/containers/Card',
  render: DefaultStory,
  decorators: [
    withTheme(), // TODO(burdon): Should not require space.
    withClientProvider({
      types: [View.View, Table.Table],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        // Configure schema.
        const typename = 'com.example.type.singleSelect';
        const selectOptions = [
          { id: 'one', title: 'One', color: 'emerald' },
          { id: 'two', title: 'Two', color: 'blue' },
          { id: 'three', title: 'Three', color: 'indigo' },
          { id: 'four', title: 'Four', color: 'red' },
          { id: 'longer_option', title: 'LONGER OPTION', color: 'amber' },
        ];

        const selectOptionIds = selectOptions.map((o) => o.id);
        const type = getSchemaFromPropertyDefinitions(typename, [
          {
            name: 'single',
            format: Format.TypeFormat.SingleSelect,
            config: { options: selectOptions },
          },
          {
            name: 'multiple',
            format: Format.TypeFormat.MultiSelect,
            config: { options: selectOptions },
          },
        ]);
        const storedType = await space.db.addType(type);

        // Initialize table.
        const { view, jsonSchema } = await ViewModel.makeFromDatabase({ db: space.db, typename });
        const table = Table.make({ view, jsonSchema });
        space.db.add(table);

        // Populate.
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            Obj.make(Type.assertObject(storedType), {
              single: random.helpers.arrayElement([...selectOptionIds, undefined]),
              multiple: random.helpers.randomSubset(selectOptionIds),
            }),
          );
        });
      },
    }),
    withPluginManager({
      plugins: [ProcessManagerPlugin()],
    }),
  ],
  parameters: {
    layout: 'centered',
    translations: [...translations, ...tableTranslations],
  },
  tags: ['cards'],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
