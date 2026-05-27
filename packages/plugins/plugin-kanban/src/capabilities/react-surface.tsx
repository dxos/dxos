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
import { DXN } from '@dxos/keys';
import { type Collection, Database, JsonSchema, Obj } from '@dxos/echo';
import { findAnnotation } from '@dxos/effect';
import { type FormFieldComponentProps, SelectField, useFormValues } from '@dxos/react-ui-form';

import { KanbanArticle, KanbanSettings } from '#containers';
import { Kanban, PivotColumnAnnotationId } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.kanban.surface.root'),
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Kanban.Kanban),
          AppSurface.object(AppSurface.Section, Kanban.Kanban),
        ),
        component: ({ data, role }) => <KanbanArticle role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.kanban.surface.objectProperties'),
        position: 'first',
        filter: AppSurface.object(AppSurface.ObjectProperties, Kanban.Kanban),
        component: ({ data }) => <KanbanSettings subject={data.subject} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.kanban.surface.createInitialSchemaFormPivotColumn'),
        role: 'form-input',
        filter: (
          data,
        ): data is {
          prop: string;
          schema: Schema.Schema<any>;
          target: Database.Database | Collection.Collection | undefined;
          fieldPropertyAst?: SchemaAST.AST;
        } => {
          const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, PivotColumnAnnotationId);
          return !!annotation;
        },
        component: ({ data: { target, fieldPropertyAst }, ...inputProps }) => {
          const ast = fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const props = { ...inputProps, type: ast } as any as FormFieldComponentProps;
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
            const properties = JsonSchema.toJsonSchema(selectedSchema).properties;
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
