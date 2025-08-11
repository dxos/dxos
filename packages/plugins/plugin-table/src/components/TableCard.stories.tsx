//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { FormatEnum } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { live } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { CardContainer } from '@dxos/react-ui-stack/testing';
import { createTable, translations as tableTranslations } from '@dxos/react-ui-table';
import { useTestTableModel } from '@dxos/react-ui-table/testing';
import { TableView } from '@dxos/react-ui-table/types';
import { DataType, getSchemaFromPropertyDefinitions } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';

import { TableCard } from './TableCard';

faker.seed(1234);

type StoryProps = { role: string };

const meta: Meta<StoryProps> = {
  title: 'plugins/plugin-table/Card',
  render: ({ role }) => {
    const { schema, view } = useTestTableModel();
    if (!schema || !view) {
      return <div />;
    }

    return (
      <CardContainer icon='ph--text-aa--regular' role={role}>
        <TableCard role={role} view={view} />
      </CardContainer>
    );
  },
  decorators: [
    // TODO(burdon): Should not require space.
    withClientProvider({
      types: [DataType.View, TableView],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ client, space }) => {
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
        const { view } = await createTable({ client, space, typename });
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
    withTheme,
    withLayout(),
  ],
  parameters: {
    layout: 'centered',
    translations: [...translations, ...tableTranslations],
  },
  tags: ['cards'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Popover = {
  args: {
    role: 'card--popover',
  },
} satisfies Story;

export const Intrinsic = {
  args: {
    role: 'card--intrinsic',
  },
} satisfies Story;

export const Extrinsic = {
  args: {
    role: 'card--extrinsic',
  },
} satisfies Story;
