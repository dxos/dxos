//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { DXN, Filter, JsonSchema, Obj, Query, type QueryAST, Tag, Type } from '@dxos/echo';
import { type View } from '@dxos/echo';
import { type Mutable } from '@dxos/echo/internal';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { ViewEditor as NaturalViewEditor } from '@dxos/react-ui-form';
import { ViewModel } from '@dxos/schema';

import { resolveSchemaWithRegistry } from '../../helpers';
import { useTypeOptions } from '../../hooks';
import { SpaceOperation } from '../../operations';

export type ViewEditorProps = { view: View.View };

export const ViewEditor = ({ view }: ViewEditorProps) => {
  const { invokePromise } = useOperationInvoker();
  const client = useClient();
  const space = getSpace(view);
  const [schema, setSchema] = useState<Schema.Schema.AnyNoContext>(() => Schema.Struct({}));
  const tags = useQuery(space?.db, Filter.type(Tag.Tag));
  const types = useTypeOptions({
    space,
    annotation: {
      location: ['database', 'runtime'],
      kind: ['user'],
    },
  });

  useAsyncEffect(async () => {
    if (!view?.query || !space) {
      return;
    }

    const foundSchema = await resolveSchemaWithRegistry(space.db.schemaRegistry, view.query.ast);
    if (foundSchema && foundSchema !== schema) {
      setSchema(() => foundSchema);
    }
  }, [client, space, view, schema]);

  const handleQueryChanged = useCallback(
    async (newQuery: QueryAST.Query, target?: string) => {
      if (!view || !space) {
        return;
      }

      const queue = target && DXN.tryParse(target) ? target : undefined;
      const query = queue ? Query.fromAst(newQuery).from({ queues: [queue] }) : Query.fromAst(newQuery);
      Obj.change(view, (obj) => {
        obj.query.ast = query.ast as Mutable<typeof query.ast>;
      });
      const newSchema = await resolveSchemaWithRegistry(space.db.schemaRegistry, query.ast);
      if (!newSchema) {
        return;
      }

      const newView = ViewModel.make({
        query,
        jsonSchema: JsonSchema.toJsonSchema(newSchema),
      });
      Obj.change(view, (obj) => {
        obj.projection = Obj.getSnapshot(newView).projection as Mutable<typeof obj.projection>;
      });

      setSchema(() => newSchema);
    },
    [view, schema],
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      void invokePromise(SpaceOperation.DeleteField, { view, fieldId });
    },
    [invokePromise, view],
  );

  if (!space || !schema) {
    return null;
  }

  return (
    <NaturalViewEditor
      registry={space.db.schemaRegistry}
      schema={schema}
      view={view}
      mode='tag'
      db={space.db}
      tags={tags}
      types={types}
      onQueryChanged={handleQueryChanged}
      onDelete={Type.isMutable(schema) ? handleDelete : undefined}
    />
  );
};
