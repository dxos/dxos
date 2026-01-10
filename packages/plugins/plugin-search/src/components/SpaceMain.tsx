//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Filter, Query, Ref, Type } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import { StackItem } from '@dxos/react-ui-stack';
import { View } from '@dxos/schema';

const VIEW = Type.getTypename(View.View);

// TODO(wittjosiah): Fix query editor reactivity.
export const SpaceMain = ({ space }: { space: Space }) => {
  const client = useClient();
  const view = space.properties[VIEW]?.target;
  const data = useMemo(() => ({ subject: view }), [view]);

  useAsyncEffect(async () => {
    // const existingView = await space.properties[VIEW]?.load();
    // if (existingView) {
    //   return;
    // }

    // Create a default view for the space.
    const { view: newView } = await View.makeFromDatabase({
      db: space.db,
      typename: undefined,
      createInitial: 0,
    });

    // Set a default query.
    newView.query.raw = '';
    newView.query.ast = Query.select(Filter.nothing()).ast;

    space.properties[VIEW] = Ref.make(newView);
  }, [space, client]);

  const builder = useMemo(() => new QueryBuilder(), []);
  const handleChange = useCallback<NonNullable<QueryEditorProps['onChange']>>(
    (value) => {
      if (!view) {
        return;
      }

      view.query.raw = value;
      const { filter } = builder.build(value);
      if (filter) {
        view.query.ast = Query.select(filter).ast;
      }
    },
    [view, builder],
  );

  if (!view) {
    return null;
  }

  return (
    <StackItem.Content>
      <Toolbar.Root>
        <QueryEditor value={view?.query.raw ?? ''} db={space.db} onChange={handleChange} />
      </Toolbar.Root>
      <Surface role='section' data={data} limit={1} />
    </StackItem.Content>
  );
};

export default SpaceMain;
