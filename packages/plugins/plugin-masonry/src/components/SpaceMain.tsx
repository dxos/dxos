//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Query, Ref } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { Masonry } from '../types';

// TODO(wittjosiah): Fix query editor reactivity.
export const SpaceMain = ({ space }: { space: Space }) => {
  const client = useClient();
  const view = space.properties[DataType.View.typename]?.target;
  const data = useMemo(() => ({ subject: view }), [view]);

  useAsyncEffect(async () => {
    const existingView = await space.properties[DataType.View.typename]?.load();
    if (existingView) {
      return;
    }

    const { view } = await Masonry.makeView({ space, client, typename: DataType.Organization.typename });
    view.query.raw = `type:${DataType.Organization.typename}`;
    space.properties[DataType.View.typename] = Ref.make(view);
  }, [space, client]);

  const builder = useMemo(() => new QueryBuilder(), []);
  const handleChange = useCallback<NonNullable<QueryEditorProps['onChange']>>(
    (value) => {
      view.query.raw = value;
      const filter = builder.build(value);
      if (view && filter) {
        view.query.ast = Query.select(filter).ast;
      }
    },
    [view, builder],
  );

  return (
    <StackItem.Content>
      <Toolbar.Root>
        <QueryEditor value={view.query.raw} db={space.db} onChange={handleChange} />
      </Toolbar.Root>
      <Surface role='section' data={data} limit={1} />
    </StackItem.Content>
  );
};

export default SpaceMain;
