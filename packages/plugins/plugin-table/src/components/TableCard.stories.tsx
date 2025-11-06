//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { FormatEnum } from '@dxos/echo/internal';
import { live } from '@dxos/echo/internal';
import { faker } from '@dxos/random';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { CardContainer } from '@dxos/react-ui-stack/testing';
import { translations as tableTranslations } from '@dxos/react-ui-table';
import { useTestTableModel } from '@dxos/react-ui-table/testing';
import { Table } from '@dxos/react-ui-table/types';
import { View, getSchemaFromPropertyDefinitions } from '@dxos/schema';

import { translations } from '../translations';

import { TableCard } from './TableCard';

faker.seed(1234);

type StoryProps = { role: string };

const DefaultStory = ({ role }: StoryProps) => {
  const { schema, view } = useTestTableModel();
  if (!schema || !view) {
    return <div />;
  }

  return (
    <CardContainer icon='ph--text-aa--regular' role={role}>
      <TableCard role={role} view={view} />
    </CardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-table/Card',
  render: DefaultStory,
  decorators: [
    withTheme, // TODO(burdon): Should not require space.
    withClientProvider({
      types: [View.View, Table.Table],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ client, space }) => {
        // Configure schema.
        const typename = 'example.com/SingleSelect';
        const selectOptions = [
          { id: 'one', title: 'One', color: 'emerald' },
          { id: 'two', title: 'Two', color: 'blue' },
          { id: 'three', title: 'Three', color: 'indigo' },
          { id: 'four', title: 'Four', color: 'red' },
          { id: 'longer_option', title: 'LONGER OPTION', color: 'amber' },
        ];

        const selectOptionIds = selectOptions.map((o) => o.id);
        const schema = getSchemaFromPropertyDefinitions(typename, [
          {
            name: 'single',
            format: FormatEnum.SingleSelect,
            config: { options: selectOptions },
          },
          {
            name: 'multiple',
            format: FormatEnum.MultiSelect,
            config: { options: selectOptions },
          },
        ]);
        const [storedSchema] = await space.db.schemaRegistry.register([schema]);

        // Initialize table.
        const { view } = await Table.makeView({ client, space, typename });
        space.db.add(view);

        // Populate.
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            live(storedSchema, {
              single: faker.helpers.arrayElement([...selectOptionIds, undefined]),
              multiple: faker.helpers.randomSubset(selectOptionIds),
            }),
          );
        });
      },
    }),
    withPluginManager({
      plugins: [IntentPlugin()],
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

export const Popover: Story = {
  args: {
    role: 'card--popover',
  },
};

export const Intrinsic: Story = {
  args: {
    role: 'card--intrinsic',
  },
};

export const Extrinsic: Story = {
  args: {
    role: 'card--extrinsic',
  },
};
