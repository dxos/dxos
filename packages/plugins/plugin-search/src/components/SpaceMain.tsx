//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { QueryBuilder } from '@dxos/echo-query';
import { useClient } from '@dxos/react-client';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Toolbar, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import { SearchList } from '@dxos/react-ui-searchlist';
import { StackItem } from '@dxos/react-ui-stack';
import { View } from '@dxos/schema';

import { meta } from '../meta';

const VIEW = Type.getTypename(View.View);

/**
 * Extract a Filter from a Query AST.
 * Currently only supports simple 'select' queries.
 */
const getFilterFromQueryAst = (ast: QueryAST.Query | undefined): Filter.Any => {
  if (!ast) {
    return Filter.nothing();
  }
  if (ast.type === 'select') {
    return Filter.fromAst(ast.filter);
  }
  // For complex queries, fall back to nothing for now.
  return Filter.nothing();
};

// TODO(wittjosiah): Fix query editor reactivity.
export const SpaceMain = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const view = space.properties[VIEW]?.target;

  useAsyncEffect(async () => {
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

  // Query results using the filter from the view's query AST.
  const filter = useMemo(() => getFilterFromQueryAst(view?.query.ast), [view?.query.ast]);
  const results = useQuery(space.db, filter);

  if (!view) {
    return null;
  }

  return (
    <SearchList.Root>
      <StackItem.Content>
        <Toolbar.Root>
          <QueryEditor value={view?.query.raw ?? ''} db={space.db} onChange={handleChange} />
        </Toolbar.Root>
        <SearchList.Content>
          <SearchList.Viewport>
            {results
              .filter((obj) => Obj.getLabel(obj))
              .map((obj) => (
                <div key={obj.id} role='none' className='pli-2 first:pbs-2 pbe-2'>
                  <Surface role='card' data={{ subject: obj }} limit={1} />
                </div>
              ))}
            {results.length === 0 && <SearchList.Empty>{t('empty results message')}</SearchList.Empty>}
          </SearchList.Viewport>
        </SearchList.Content>
      </StackItem.Content>
    </SearchList.Root>
  );
};

export default SpaceMain;
