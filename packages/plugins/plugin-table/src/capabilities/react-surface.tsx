//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import React, { useMemo } from 'react';

import { Capabilities, contributes, createSurface, useCapabilities } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { type Ref } from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type CollectionType } from '@dxos/plugin-space/types';
import { useClient } from '@dxos/react-client';
import { getSpace, isEchoObject, isSpace, type AnyLiveObject, type Space } from '@dxos/react-client/echo';
import { type InputProps, SelectInput } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { TableType } from '@dxos/react-ui-table';
import { ViewType } from '@dxos/schema';

import { ObjectDetailsPanel, TableContainer, TableViewEditor } from '../components';
import { meta } from '../meta';
import { TypenameAnnotationId } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/table`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: TableType } => Obj.instanceOf(TableType, data.subject) && !data.variant,
      component: ({ data, role }) => <TableContainer table={data.subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/companion/schema`,
      role: 'article',
      filter: (data): data is { companionTo: TableType; subject: 'schema' } =>
        Obj.instanceOf(TableType, data.companionTo) && data.subject === 'schema',
      component: ({ data, role }) => {
        return (
          <StackItem.Content role={role}>
            <TableViewEditor table={data.companionTo} />
          </StackItem.Content>
        );
      },
    }),
    // createSurface({
    //   id: `${meta.id}/object-settings`,
    //   role: 'object-settings',
    //   filter: (data): data is { subject: TableType } => Obj.instanceOf(TableType, data.subject),
    //   component: ({ data }) => <TableViewEditor table={data.subject} />,
    // }),
    createSurface({
      id: `${meta.id}/selected-objects`,
      role: 'article',
      filter: (
        data,
      ): data is {
        companionTo: AnyLiveObject<{ view: Ref<ViewType> } | { cardView: Ref<ViewType> }>;
      } => {
        if (data.subject !== 'selected-objects' || !data.companionTo || !isEchoObject(data.companionTo)) {
          return false;
        }

        const companionTo = data.companionTo as any;
        // TODO(ZaymonFC): Unify the path of view between table and kanban.
        const hasValidView = companionTo.view?.target instanceof ViewType;
        const hasValidCardView = companionTo.cardView?.target instanceof ViewType;
        return hasValidView || hasValidCardView;
      },
      component: ({ data }) => {
        const view = 'view' in data.companionTo ? data.companionTo.view : data.companionTo.cardView;
        const viewTarget = view?.target;
        if (!viewTarget) {
          return null;
        }

        return <ObjectDetailsPanel objectId={data.companionTo.id} view={viewTarget} />;
      },
    }),
    // TODO(burdon): Factor out from Table, Kanban, and Map.
    createSurface({
      id: `${meta.id}/create-initial-schema-form`,
      role: 'form-input',
      filter: (
        data,
      ): data is { prop: string; schema: Schema.Schema<any>; target: Space | CollectionType | undefined } => {
        if (data.prop !== 'typename') {
          return false;
        }

        const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, TypenameAnnotationId);
        return !!annotation;
      },
      component: ({ data: { target }, ...inputProps }) => {
        const client = useClient();
        const props = inputProps as any as InputProps;
        const space = isSpace(target) ? target : getSpace(target);
        if (!space) {
          return null;
        }

        const schemaWhitelists = useCapabilities(ClientCapabilities.SchemaWhiteList);
        const whitelistedTypenames = useMemo(
          () => new Set(schemaWhitelists.flatMap((typeArray) => typeArray.map((type) => type.typename))),
          [schemaWhitelists],
        );

        const fixed = client.graph.schemaRegistry.schemas.filter((schema) =>
          whitelistedTypenames.has(Type.getTypename(schema)),
        );
        const dynamic = space?.db.schemaRegistry.query().runSync();
        const typenames = Array.from(
          new Set<string>([
            ...fixed.map((schema) => Type.getTypename(schema)),
            ...dynamic.map((schema) => schema.typename),
          ]),
        ).sort();

        return <SelectInput {...props} options={typenames.map((typename) => ({ value: typename }))} />;
      },
    }),
  ]);
