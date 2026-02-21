//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Database, Obj, Type } from '@dxos/echo';
import { findAnnotation } from '@dxos/effect';
import { type FormFieldComponentProps, SelectField, useFormValues } from '@dxos/react-ui-form';
import { type Collection } from '@dxos/schema';

import { KanbanContainer, KanbanViewEditor } from '../../components';
import { meta } from '../../meta';
import { Kanban, PivotColumnAnnotationId } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: ['article', 'section'],
        filter: (data): data is { subject: Kanban.Kanban } => Obj.instanceOf(Kanban.Kanban, data.subject),
        component: ({ data, role }) => <KanbanContainer role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}/object-settings`,
        role: 'object-settings',
        position: 'hoist',
        filter: (data): data is { subject: Kanban.Kanban } => Obj.instanceOf(Kanban.Kanban, data.subject),
        component: ({ data }) => <KanbanViewEditor object={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}/create-initial-schema-form-[pivot-column]`,
        role: 'form-input',
        filter: (
          data,
        ): data is {
          prop: string;
          schema: Schema.Schema<any>;
          target: Database.Database | Collection.Collection | undefined;
        } => {
          const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, PivotColumnAnnotationId);
          return !!annotation;
        },
        component: ({ data: { target }, ...inputProps }) => {
          const props = inputProps as any as FormFieldComponentProps;
          const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
          if (!db) {
            return null;
          }

          const { typename } = useFormValues('KanbanForm');
          const [selectedSchema] = useMemo(
            () => db.schemaRegistry.query({ location: ['database', 'runtime'], typename }).runSync(),
            [db, typename],
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
    ]),
  ),
);
