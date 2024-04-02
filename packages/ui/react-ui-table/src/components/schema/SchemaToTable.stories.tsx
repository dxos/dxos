//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import * as Arbitrary from '@effect/schema/Arbitrary';
import * as S from '@effect/schema/Schema';
import * as fc from 'fast-check';
import React, { useRef } from 'react';

import { DensityProvider } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { schemaToColumnDefs } from './schemaToColumns';
import { Table } from '../Table/Table';

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
  // Not editable yet
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
    const containerRef = useRef<HTMLDivElement | null>(null);

    // TODO(zan): (Updates?)

    return (
      <div ref={containerRef} className='fixed inset-0 overflow-auto'>
        <Table<ExampleSchema>
          role='grid'
          rowsSelectable='multi'
          keyAccessor={(row) => JSON.stringify(row)}
          columns={columns}
          data={items}
          fullWidth
          stickyHeader
          border
          getScrollElement={() => containerRef.current}
        />
      </div>
    );
  },
};
