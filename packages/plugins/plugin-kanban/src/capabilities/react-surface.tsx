//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import React, { useMemo } from 'react';

import { Capabilities, contributes, createSurface, useCapabilities } from '@dxos/app-framework';
import { getTypenameOrThrow, toJsonSchema } from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type CollectionType } from '@dxos/plugin-space/types';
import { useClient } from '@dxos/react-client';
import { getSpace, isSpace, type Space } from '@dxos/react-client/echo';
import { type InputProps, SelectInput, useFormValues } from '@dxos/react-ui-form';
import { type KanbanType } from '@dxos/react-ui-kanban';

import { KanbanContainer, KanbanViewEditor } from '../components';
import { KANBAN_PLUGIN } from '../meta';
import { isKanban, TypenameAnnotationId, PivotColumnAnnotationId } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${KANBAN_PLUGIN}/kanban`,
      role: ['article', 'section'],
      filter: (data): data is { subject: KanbanType } => isKanban(data.subject),
      component: ({ data, role }) => <KanbanContainer kanban={data.subject} role={role} />,
    }),
    createSurface({
      id: `${KANBAN_PLUGIN}/object-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: KanbanType } => isKanban(data.subject),
      component: ({ data }) => <KanbanViewEditor kanban={data.subject} />,
    }),
    createSurface({
      id: `${KANBAN_PLUGIN}/create-initial-schema-form`,
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
          whitelistedTypenames.has(getTypenameOrThrow(schema)),
        );
        const dynamic = space?.db.schemaRegistry.query().runSync();
        const typenames = Array.from(
          new Set<string>([
            ...fixed.map((schema) => getTypenameOrThrow(schema)),
            ...dynamic.map((schema) => schema.typename),
          ]),
        ).sort();

        return <SelectInput {...props} options={typenames.map((typename) => ({ value: typename }))} />;
      },
    }),
    createSurface({
      id: `${KANBAN_PLUGIN}/create-initial-schema-form-[pivot-column]`,
      role: 'form-input',
      filter: (
        data,
      ): data is { prop: string; schema: Schema.Schema<any>; target: Space | CollectionType | undefined } => {
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
        const staticSchema = schemaWhitelists.flat().find((schema) => getTypenameOrThrow(schema) === typename);
        const [selectedSchema] = space?.db.schemaRegistry.query({ typename }).runSync();

        const singleSelectColumns = useMemo(() => {
          const properties = staticSchema
            ? toJsonSchema(staticSchema).properties
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
