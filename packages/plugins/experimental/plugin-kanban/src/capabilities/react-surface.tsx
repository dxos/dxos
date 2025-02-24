//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { type S } from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { type CollectionType } from '@dxos/plugin-space/types';
import { getSpace, isSpace, type Space } from '@dxos/react-client/echo';
import { type InputProps, SelectInput, useFormValues } from '@dxos/react-ui-form';
import { type KanbanType } from '@dxos/react-ui-kanban';

import { KanbanContainer, KanbanViewEditor } from '../components';
import { KANBAN_PLUGIN } from '../meta';
import { isKanban, InitialSchemaAnnotationId, InitialPivotColumnAnnotationId } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${KANBAN_PLUGIN}/kanban`,
      role: ['article', 'section'],
      filter: (data): data is { subject: KanbanType } => isKanban(data.subject),
      component: ({ data, role }) => <KanbanContainer kanban={data.subject} role={role} />,
    }),
    createSurface({
      id: `${KANBAN_PLUGIN}/settings`,
      role: 'complementary--settings',
      filter: (data): data is { subject: KanbanType } => isKanban(data.subject),
      component: ({ data }) => <KanbanViewEditor kanban={data.subject} />,
    }),
    createSurface({
      id: `${KANBAN_PLUGIN}/create-initial-schema-form-[schema]`,
      role: 'form-input',
      filter: (data): data is { prop: string; schema: S.Schema<any>; target: Space | CollectionType | undefined } => {
        const annotation = findAnnotation<boolean>((data.schema as S.Schema.All).ast, InitialSchemaAnnotationId);
        return !!annotation;
      },
      component: ({ data: { target }, ...inputProps }) => {
        const props = inputProps as any as InputProps;
        const space = isSpace(target) ? target : getSpace(target);
        if (!space) {
          return null;
        }
        const schemata = space?.db.schemaRegistry.query().runSync();

        return <SelectInput {...props} options={schemata.map((schema) => ({ value: schema.typename }))} />;
      },
    }),
    createSurface({
      id: `${KANBAN_PLUGIN}/create-initial-schema-form-[pivot-column]`,
      role: 'form-input',
      filter: (data): data is { prop: string; schema: S.Schema<any>; target: Space | CollectionType | undefined } => {
        const annotation = findAnnotation<boolean>((data.schema as S.Schema.All).ast, InitialPivotColumnAnnotationId);
        return !!annotation;
      },
      component: ({ data: { target }, ...inputProps }) => {
        const props = inputProps as any as InputProps;
        const space = isSpace(target) ? target : getSpace(target);
        if (!space) {
          return null;
        }
        const { initialSchema } = useFormValues();
        const [selectedSchema] = space?.db.schemaRegistry.query({ typename: initialSchema }).runSync();

        const singleSelectColumns = useMemo(() => {
          if (!selectedSchema?.jsonSchema?.properties) {
            return [];
          }

          const columns = Object.entries(selectedSchema.jsonSchema.properties).reduce<string[]>((acc, [key, value]) => {
            if (typeof value === 'object' && value?.format === 'single-select') {
              acc.push(key);
            }
            return acc;
          }, []);

          return columns;
        }, [selectedSchema?.jsonSchema]);

        if (!initialSchema) {
          return null;
        }

        return <SelectInput {...props} options={singleSelectColumns.map((column) => ({ value: column }))} />;
      },
    }),
  ]);
