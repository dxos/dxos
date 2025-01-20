//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { type S } from '@dxos/echo-schema';
import { type CollectionType } from '@dxos/plugin-space/types';
import { getSpace, isSpace, type Space } from '@dxos/react-client/echo';
import { type InputProps, SelectInput } from '@dxos/react-ui-form';
import { TableType } from '@dxos/react-ui-table';

import { TableContainer, TableViewEditor } from '../components';
import { TABLE_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${TABLE_PLUGIN}/table`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: TableType } => data.subject instanceof TableType,
      component: ({ data, role }) => <TableContainer table={data.subject} role={role} />,
    }),
    createSurface({
      id: `${TABLE_PLUGIN}/settings-panel`,
      role: 'complementary--settings',
      filter: (data): data is { subject: TableType } => data.subject instanceof TableType,
      component: ({ data }) => <TableViewEditor table={data.subject} />,
    }),
    createSurface({
      id: `${TABLE_PLUGIN}/create-initial-schema-form`,
      role: 'form-input',
      filter: (data): data is { prop: string; schema: S.Schema<any>; target: Space | CollectionType | undefined } => {
        if (data.prop !== 'initialSchema') {
          return false;
        }

        // TODO(ZaymonFC): use an annotation on the schema.
        return true;
      },
      component: ({ data: { target }, ...inputProps }) => {
        const props = inputProps as any as InputProps<any>;
        const space = isSpace(target) ? target : getSpace(target);
        if (!space) {
          return null;
        }
        // TODO(ZaymonFC): Make this reactive.
        const schemata = space?.db.schemaRegistry.query().runSync();

        return (
          <SelectInput<any>
            {...props}
            property={props.property as any}
            options={schemata.map((schema) => ({ value: schema.typename }))}
          />
        );
      },
    }),
  ]);
