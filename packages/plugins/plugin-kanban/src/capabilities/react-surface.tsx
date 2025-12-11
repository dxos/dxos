//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { findAnnotation } from '@dxos/effect';
import { type Space, getSpace, isSpace } from '@dxos/react-client/echo';
import { type FormFieldComponentProps, SelectField, useFormValues } from '@dxos/react-ui-form';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { type Collection } from '@dxos/schema';

import { KanbanContainer, KanbanViewEditor } from '../components';
import { meta } from '../meta';
import { PivotColumnAnnotationId } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section'],
      filter: (data): data is { subject: Kanban.Kanban } => Obj.instanceOf(Kanban.Kanban, data.subject),
      component: ({ data, role }) => <KanbanContainer object={data.subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/object-settings`,
      role: 'object-settings',
      position: 'hoist',
      filter: (data): data is { subject: Kanban.Kanban } => Obj.instanceOf(Kanban.Kanban, data.subject),
      component: ({ data }) => <KanbanViewEditor object={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/create-initial-schema-form-[pivot-column]`,
      role: 'form-input',
      filter: (
        data,
      ): data is {
        prop: string;
        schema: Schema.Schema<any>;
        target: Space | Collection.Collection | undefined;
      } => {
        const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, PivotColumnAnnotationId);
        return !!annotation;
      },
      component: ({ data: { target }, ...inputProps }) => {
        const props = inputProps as any as FormFieldComponentProps;
        const space = isSpace(target) ? target : getSpace(target);
        if (!space) {
          return null;
        }

        const { typename } = useFormValues('KanbanForm');
        const [selectedSchema] = useMemo(
          () => space?.db.schemaRegistry.query({ location: ['database', 'runtime'], typename }).runSync(),
          [space, typename],
        );
        const singleSelectColumns = useMemo(() => {
          const properties = Type.toJsonSchema(selectedSchema).properties;
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
        }, [selectedSchema]);

        if (!typename) {
          return null;
        }

        return <SelectField {...props} options={singleSelectColumns.map((column) => ({ value: column }))} />;
      },
    }),
  ]);
