//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { Arbitrary } from '@effect/schema';
import * as fc from 'fast-check';
import React from 'react';

import { S } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { schemaToColumnDefs } from './column-utils';
import { Table } from '../components';

export default {
  title: 'react-ui-table/Schema',
  decorators: [withTheme, withLayout()],
};

const TestSchema = S.Struct({
  field1: S.String,
  field2: S.Number,
  field3: S.Date,
  field4: S.optional(S.String.pipe(S.length(10))),
  field5: S.optional(
    S.Struct({
      innerField1: S.String,
      innerField2: S.Number,
    }),
  ),
});

type TestType = S.Schema.Type<typeof TestSchema>;

const columns = schemaToColumnDefs(TestSchema);
const items = fc.sample(Arbitrary.make(TestSchema), 10);

export const Default = {
  render: () => {
    return (
      <Table.Root>
        <Table.Viewport classNames='fixed inset-0'>
          <Table.Main<TestType>
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
