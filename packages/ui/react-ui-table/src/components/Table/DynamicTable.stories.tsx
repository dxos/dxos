//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useMemo, useState } from 'react';

import { FormatEnum, type JsonSchemaType } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, useQuery, useSchema, create } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { type SchemaPropertyDefinition } from '@dxos/schema';
import { Testing } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { DynamicTable } from './DynamicTable';
import translations from '../../translations';

faker.seed(0);

//
// Story components.
//

const DynamicTableStory = () => {
  const properties = useMemo<SchemaPropertyDefinition[]>(
    () => [
      { name: 'name', format: FormatEnum.String },
      { name: 'age', format: FormatEnum.Number },
    ],
    [],
  );

  const [objects, _setObjects] = useState<any[]>(
    Array.from({ length: 100 }, () => ({
      name: faker.person.fullName(),
      age: faker.number.int({ min: 18, max: 80 }),
    })),
  );

  return <DynamicTable properties={properties} data={objects} />;
};

//
// Story definitions.
//

const meta: Meta = {
  title: 'ui/react-ui-table/DynamicTable',
  component: DynamicTable,
  parameters: { translations },
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true })],
};

export default meta;

export const Default: StoryObj = {
  render: DynamicTableStory,
};

export const WithRowClicks: StoryObj = {
  render: () => {
    const properties = useMemo<SchemaPropertyDefinition[]>(
      () => [
        { name: 'name', format: FormatEnum.String },
        { name: 'age', format: FormatEnum.Number },
      ],
      [],
    );

    const [objects, _setObjects] = useState<any[]>(
      Array.from({ length: 10 }, () => ({
        name: faker.person.fullName(),
        age: faker.number.int({ min: 18, max: 80 }),
      })),
    );

    const handleRowClicked = (row: any) => {
      console.log('Row clicked:', row);
      alert(`Row clicked: ${row.name}, age: ${row.age}`);
    };

    return <DynamicTable properties={properties} data={objects} onRowClicked={handleRowClicked} />;
  },
};

export const WithJsonSchema: StoryObj = {
  render: () => {
    const schema = useMemo<JsonSchemaType>(
      () => ({
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Full Name' },
          age: { type: 'number', title: 'Age (Years)' },
          email: { type: 'string', format: 'email', title: 'Email Address' },
          active: { type: 'boolean', title: 'Active Status' },
        },
        required: ['name', 'email'],
      }),
      [],
    );

    const [objects, _setObjects] = useState<any[]>(
      Array.from({ length: 15 }, () => ({
        name: faker.person.fullName(),
        age: faker.number.int({ min: 18, max: 80 }),
        email: faker.internet.email(),
        active: faker.datatype.boolean(),
      })),
    );

    return <DynamicTable schema={schema} data={objects} tableName='com.example/json_schema_table' />;
  },
};

export const WithEchoSchema: StoryObj = {
  render: () => {
    const client = useClient();
    const { space } = useClientProvider();
    const schema = useSchema(client, space, Testing.ContactType.typename);
    const objects = useQuery(space, schema ? Filter.schema(schema) : Filter.nothing());

    if (!schema) {
      return <div>Loading schema...</div>;
    }

    return <DynamicTable schema={schema.jsonSchema} data={objects} tableName='contact-table' />;
  },
  decorators: [
    withClientProvider({
      types: [Testing.ContactType],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ space }) => {
        Array.from({ length: 10 }).forEach(() => {
          space.db.add(
            create(Testing.ContactType, {
              name: faker.person.fullName(),
              email: faker.internet.email(),
            }),
          );
        });
      },
    }),
  ],
};
