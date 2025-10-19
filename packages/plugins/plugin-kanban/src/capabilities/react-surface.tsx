//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Capabilities, contributes, createSurface, useCapabilities } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { findAnnotation } from '@dxos/effect';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type Space, getSpace, isSpace } from '@dxos/react-client/echo';
import { type InputProps, SelectInput, useFormValues } from '@dxos/react-ui-form';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { DataType } from '@dxos/schema';

import { KanbanContainer, KanbanViewEditor } from '../components';
import { meta } from '../meta';
import { PivotColumnAnnotationId } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section'],
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && Obj.instanceOf(Kanban.Kanban, data.subject.presentation.target),
      component: ({ data, role }) => <KanbanContainer view={data.subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/object-settings`,
      role: 'object-settings',
      position: 'hoist',
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && Obj.instanceOf(Kanban.Kanban, data.subject.presentation.target),
      component: ({ data }) => <KanbanViewEditor view={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/create-initial-schema-form-[pivot-column]`,
      role: 'form-input',
      filter: (
        data,
      ): data is { prop: string; schema: Schema.Schema<any>; target: Space | DataType.Collection | undefined } => {
        const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, PivotColumnAnnotationId);
        return !!annotation;
      },
      component: ({ data: { target }, ...inputProps }) => {
        const props = inputProps as any as InputProps;
        const space = isSpace(target) ? target : getSpace(target);
        if (!space) {
          return null;
        }
        const { typename } = useFormValues();
        // TODO(wittjosiah): Unify this schema lookup.
        const schemaWhitelists = useCapabilities(ClientCapabilities.SchemaWhiteList);
        const staticSchema = schemaWhitelists.flat().find((schema) => Type.getTypename(schema) === typename);
        const [selectedSchema] = space?.db.schemaRegistry.query({ typename }).runSync();

        const singleSelectColumns = useMemo(() => {
          const properties = staticSchema
            ? Type.toJsonSchema(staticSchema).properties
            : selectedSchema?.jsonSchema?.properties;
          if (!properties) {
            return [];
          }

          const columns = Object.entries(properties).reduce<string[]>((acc, [key, value]) => {
            if (typeof value === 'object' && value?.format === 'single-select') {
              acc.push(key);
            }
            return acc;
          }, []);

          return columns;
        }, [selectedSchema?.jsonSchema, staticSchema]);

        if (!typename) {
          return null;
        }

        return <SelectInput {...props} options={singleSelectColumns.map((column) => ({ value: column }))} />;
      },
    }),
  ]);
