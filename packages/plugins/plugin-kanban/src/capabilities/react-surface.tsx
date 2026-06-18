//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Collection, Database, Obj, Type } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { type FormFieldRendererProps, SelectField, useFormValues } from '@dxos/react-ui-form';

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
        position: 'first',
        filter: AppSurface.object(AppSurface.ObjectProperties, Kanban.Kanban),
        component: ({ data }) => <KanbanSettings subject={data.subject} />,
      }),
      Surface.create({
        id: 'createInitialSchemaForm',
        filter: Surface.makeFilter(AppSurface.FormInput, (data) => {
          const { schema } = data as { schema?: Schema.Schema.All };
          if (!schema?.ast) {
            return false;
          }
          return !!SchemaEx.findAnnotation<boolean>(schema.ast, PivotColumnAnnotationId);
        }),
        component: ({ data: rawData, ...inputProps }) => {
          // FormInput data is untyped at framework level; casts align with what the filter validates.
          const ast = rawData.fieldPropertyAst as SchemaAST.AST | undefined;
          if (!ast) {
            return null;
          }

          const props = { ...inputProps, type: ast } as any as FormFieldRendererProps;
          const target = rawData.target;
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
                .filter((t: Type.Type) => Type.getTypename(t) === typename),
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
