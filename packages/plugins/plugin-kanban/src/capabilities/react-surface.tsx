//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Obj, Type } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { type FormFieldRendererProps, SelectField, useFormValues } from '@dxos/react-ui-form';
import { Position } from '@dxos/util';

import { KanbanArticle, KanbanSettings } from '#containers';
import { Kanban, PivotColumnAnnotationId } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'root',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Kanban.Kanban),
          AppSurface.object(AppSurface.Section, Kanban.Kanban),
        ),
        component: ({ data, role }) => <KanbanArticle role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: 'objectProperties',
        position: Position.first,
        filter: AppSurface.object(AppSurface.ObjectProperties, Kanban.Kanban),
        component: ({ data }) => <KanbanSettings subject={data.subject} />,
      }),
      Surface.create({
        id: 'createInitialSchemaForm',
        filter: AppSurface.formInputBySchema((ast) => !!SchemaEx.findAnnotation<boolean>(ast, PivotColumnAnnotationId)),
        component: ({ data, ...inputProps }) => {
          const ast = data.fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const props = { ...inputProps, type: ast } as any as FormFieldRendererProps;
          const target = data.target;
          const db = Database.isDatabase(target) ? target : Obj.isObject(target) ? Obj.getDatabase(target) : undefined;
          if (!db) {
            return null;
          }

          const { typename } = useFormValues('KanbanForm');
          const [selectedSchema] = useMemo(
            () =>
              db.graph.registry
                .list()
                .filter(Type.isType)
                .filter((t) => Type.getTypename(t) === typename),
            [db, typename],
          );
          const singleSelectColumns = useMemo(() => {
            if (!selectedSchema) {
              return [];
            }
            const jsonSchema = selectedSchema.jsonSchema;
            const properties = jsonSchema.properties;
            if (!properties) {
              return [];
            }

            const columns = Object.entries(properties).reduce<string[]>((acc, [key, value]) => {
              if (
                typeof value === 'object' &&
                value !== null &&
                (value as { format?: string }).format === 'single-select'
              ) {
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
