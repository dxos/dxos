//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf, type Ref, type S } from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { type CollectionType } from '@dxos/plugin-space/types';
import { getSpace, isEchoObject, isSpace, type ReactiveEchoObject, type Space } from '@dxos/react-client/echo';
import { type InputProps, SelectInput } from '@dxos/react-ui-form';
import { TableType } from '@dxos/react-ui-table';
import { ViewType } from '@dxos/schema';

import { ObjectDetailsPanel, TableContainer, TableViewEditor } from '../components';
import { TABLE_PLUGIN } from '../meta';
import { InitialSchemaAnnotationId } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${TABLE_PLUGIN}/table`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: TableType } => isInstanceOf(TableType, data.subject),
      component: ({ data, role }) => <TableContainer table={data.subject} role={role} />,
    }),
    createSurface({
      id: `${TABLE_PLUGIN}/settings-panel`,
      role: 'complementary--settings',
      filter: (data): data is { subject: TableType } => isInstanceOf(TableType, data.subject),
      component: ({ data }) => <TableViewEditor table={data.subject} />,
    }),
    createSurface({
      id: `${TABLE_PLUGIN}/complementary`,
      role: 'complementary--selected-objects',
      filter: (
        data,
      ): data is {
        subject: ReactiveEchoObject<{ view: Ref<ViewType> } | { cardView: Ref<ViewType> }>;
      } => {
        if (!data.subject || !isEchoObject(data.subject)) {
          return false;
        }

        const subject = data.subject;
        // TODO(ZaymonFC): Unify the path of view between table and kanban.
        const hasValidView = subject.view?.target instanceof ViewType;
        const hasValidCardView = subject.cardView?.target instanceof ViewType;
        return hasValidView || hasValidCardView;
      },
      component: ({ data }) => {
        const view = 'view' in data.subject ? data.subject.view : data.subject.cardView;
        const viewTarget = view?.target;
        if (!viewTarget) {
          return null;
        }

        return <ObjectDetailsPanel objectId={data.subject.id} view={viewTarget} />;
      },
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
        // TODO(burdon): Also add static types?
        const schemata = space?.db.schemaRegistry.query().runSync();
        return <SelectInput {...props} options={schemata.map((schema) => ({ value: schema.typename }))} />;
      },
    }),
  ]);
