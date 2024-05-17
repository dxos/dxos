//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import * as Arbitrary from '@effect/schema/Arbitrary';
import * as fc from 'fast-check';
import React from 'react';

import { S } from '@dxos/echo-schema';
import { DensityProvider } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { schemaToColumnDefs } from './schemaToColumns';
import { Table } from '../components';

export default {
  title: 'react-ui-table/SchemaTable',
  args: {},
  decorators: [
    withTheme,
    (Story: any) => (
      <DensityProvider density='fine'>
        <Story />
      </DensityProvider>
    ),
  ],
};

const exampleSchema = S.struct({
  field1: S.string,
  field2: S.number,
  field3: S.Date,
  field4: S.optional(S.string.pipe(S.length(10))),
  field5: S.optional(
    S.struct({
      innerField1: S.string,
      innerField2: S.number,
    }),
  ),
});

type ExampleSchema = S.Schema.Type<typeof exampleSchema>;

const columns = schemaToColumnDefs(exampleSchema);

const exampleSchemaArbitrary = Arbitrary.make(exampleSchema)(fc);

const items = fc.sample(exampleSchemaArbitrary, 10);

export const SchemaTable = {
  render: () => {
    return (
      <Table.Root>
        <Table.Viewport classNames='inset-0 fixed'>
          <Table.Main<ExampleSchema>
            role='grid'
            rowsSelectable='multi'
            keyAccessor={(row) => JSON.stringify(row)}
            columns={columns}
            data={items}
            fullWidth
            stickyHeader
            border
          />
        </Table.Viewport>
      </Table.Root>
    );
  },
};
