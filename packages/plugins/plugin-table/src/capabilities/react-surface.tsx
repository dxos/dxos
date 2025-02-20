//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { type S } from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { type CollectionType } from '@dxos/plugin-space/types';
import { getSpace, isSpace, type Space } from '@dxos/react-client/echo';
import { type InputProps, SelectInput } from '@dxos/react-ui-form';
import { TableType } from '@dxos/react-ui-table';

import { RowDetailsPanel, TableContainer, TableViewEditor } from '../components';
import { TABLE_PLUGIN } from '../meta';
import { InitialSchemaAnnotationId } from '../types';

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

        const annotation = findAnnotation<boolean>((data.schema as S.Schema.All).ast, InitialSchemaAnnotationId);
        return !!annotation;
      },
      component: ({ data: { target }, ...inputProps }) => {
        const props = inputProps as any as InputProps;
        const space = isSpace(target) ? target : getSpace(target);
        if (!space) {
          return null;
        }
        // TODO(ZaymonFC): Make this reactive.
        const schemata = space?.db.schemaRegistry.query().runSync();

        return <SelectInput {...props} options={schemata.map((schema) => ({ value: schema.typename }))} />;
      },
    }),
    createSurface({
      id: `${TABLE_PLUGIN}/complementary`,
      role: 'complementary--properties',
      filter: (data): data is { subject: TableType } => data.subject instanceof TableType,
      component: ({ data }) => <RowDetailsPanel table={data.subject} />,
    }),
  ]);
