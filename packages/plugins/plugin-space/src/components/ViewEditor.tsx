//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { createIntent } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { DXN, Filter, Obj, Query, type QueryAST, Tag, Type } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { ViewEditor as NaturalViewEditor } from '@dxos/react-ui-form';
import { View } from '@dxos/schema';

import { resolveSchemaWithClientAndSpace } from '../helpers';
import { useTypeOptions } from '../hooks';
import { SpaceAction } from '../types';

export type ViewEditorProps = { view: View.View };

export const ViewEditor = ({ view }: ViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const space = getSpace(view);
  const [schema, setSchema] = useState<Schema.Schema.AnyNoContext>(() => Schema.Struct({}));
  const tags = useQuery(space, Filter.type(Tag.Tag));
  const types = useTypeOptions({ space, annotation: ['dynamic', 'limited-static', 'object-form'] });

  useAsyncEffect(async () => {
    if (!view?.query || !space) {
      return;
    }

    const foundSchema = await resolveSchemaWithClientAndSpace(client, space, view.query.ast);
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
      const query = queue ? Query.fromAst(newQuery).options({ queues: [queue] }) : Query.fromAst(newQuery);
      view.query.ast = query.ast;
      const newSchema = await resolveSchemaWithClientAndSpace(client, space, query.ast);
      if (!newSchema) {
        return;
      }

      const newView = View.make({
        query,
        jsonSchema: Type.toJsonSchema(newSchema),
      });
      view.projection = Obj.getSnapshot(newView).projection;

      setSchema(() => newSchema);
    },
    [view, schema],
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      void dispatch(createIntent(SpaceAction.DeleteField, { view, fieldId }));
    },
    [dispatch, view],
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
      outerSpacing={false}
      tags={tags}
      types={types}
      onQueryChanged={handleQueryChanged}
      onDelete={Type.isMutable(schema) ? handleDelete : undefined}
    />
  );
};
