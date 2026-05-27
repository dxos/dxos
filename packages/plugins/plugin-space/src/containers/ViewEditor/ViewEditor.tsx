//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { resolveSchemaWithRegistry } from '@dxos/app-toolkit/query';
import { useTypeOptions } from '@dxos/app-toolkit/ui';
import { EchoURI, Filter, Obj, Query, type QueryAST, Tag, Type, type View } from '@dxos/echo';
import { type Mutable } from '@dxos/echo/internal';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { ViewEditor as NaturalViewEditor } from '@dxos/react-ui-form';
import { ViewModel } from '@dxos/schema';

import { SpaceOperation } from '#operations';

export type ViewEditorProps = { view: View.View };

export const ViewEditor = ({ view }: ViewEditorProps) => {
  const { invokePromise } = useOperationInvoker();
  const client = useClient();
  const db = Obj.getDatabase(view);
  const [type, setType] = useState<Type.AnyEntity>();
  const tags = useQuery(db, Filter.type(Tag.Tag));
  const types = useTypeOptions({
    db,
    annotation: {
      location: ['database', 'runtime'],
      kind: ['user'],
    },
  });

  useAsyncEffect(async () => {
    if (!view?.query || !db) {
      return;
    }

    const foundType = await resolveSchemaWithRegistry(db.schemaRegistry, view.query.ast);
    if (foundType && foundType !== type) {
      setType(() => foundType);
    }
  }, [client, db, view, type]);

  const handleQueryChanged = useCallback(
    async (newQuery: QueryAST.Query, target?: EchoURI.EchoURI) => {
      if (!view || !db) {
        return;
      }

      const queue = target;
      const query = queue ? Query.fromAst(newQuery).from({ feeds: [queue] }) : Query.fromAst(newQuery);
      Obj.update(view, (view) => {
        view.query.ast = query.ast as Mutable<typeof query.ast>;
      });
      const newType = await resolveSchemaWithRegistry(db.schemaRegistry, query.ast);
      if (!newType) {
        return;
      }

      const newView = ViewModel.make({
        query,
        jsonSchema: newType.jsonSchema,
      });
      Obj.update(view, (view) => {
        view.projection = Obj.getSnapshot(newView).projection as Mutable<typeof view.projection>;
      });

      setType(() => newType);
    },
    [view, type],
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      void invokePromise(SpaceOperation.DeleteField, { view, fieldId });
    },
    [invokePromise, view],
  );

  if (!db || !type) {
    return null;
  }

  return (
    <NaturalViewEditor
      registry={db.schemaRegistry}
      schema={type}
      view={view}
      mode='tag'
      db={db}
      tags={tags}
      types={types}
      onQueryChanged={handleQueryChanged}
      onDelete={Type.getDatabase(type) != null ? handleDelete : undefined}
    />
  );
};
