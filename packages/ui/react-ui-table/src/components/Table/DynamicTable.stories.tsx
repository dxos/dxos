//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useMemo, useState } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { type SchemaPropertyDefinition } from '@dxos/schema';
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
