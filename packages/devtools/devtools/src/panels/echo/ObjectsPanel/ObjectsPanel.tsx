//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { typeOf } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { type OpaqueEchoObject, useQuery, QueryOptions } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef, textPadding } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer, Searchbar } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  // TODO(burdon): Structured query (e.g., "type:Text").
  const matcher = new RegExp(text, 'i');
  return (item: OpaqueEchoObject) => {
    let match = false;
    match ||= !!typeOf(item)?.itemId.match(matcher);
    match ||= !!String((item as any).title ?? '').match(matcher);
    return match;
  };
};

const { helper, builder } = createColumnBuilder<OpaqueEchoObject>();
const columns: TableColumnDef<OpaqueEchoObject, any>[] = [
  helper.accessor((item) => PublicKey.from(item.id), { id: 'id', ...builder.key({ tooltip: true }) }),
  helper.accessor((item) => typeOf(item)?.itemId, {
    id: 'type',
    meta: { cell: { classNames: textPadding } },
    size: 220,
  }),
  // TODO(wittjosiah): Make deleted accessible again.
  helper.accessor((item) => /* (item.__deleted ? 'deleted' : '') */ '', {
    id: 'deleted',
    meta: { cell: { classNames: textPadding } },
    size: 80,
  }),
];

export const ObjectsPanel = () => {
  const { space } = useDevtoolsState();
  // TODO(burdon): Sort by type?
  const items = useQuery(space, {}, { deleted: QueryOptions.ShowDeletedOption.SHOW_DELETED });
  const [filter, setFilter] = useState('');

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <SpaceSelector />
          <Searchbar onChange={setFilter} />
        </Toolbar.Root>
      }
    >
      <MasterDetailTable<OpaqueEchoObject>
        columns={columns}
        data={items.filter(textFilter(filter))}
        widths={['is-1/3 shrink-0', '']}
      />
    </PanelContainer>
  );
};
