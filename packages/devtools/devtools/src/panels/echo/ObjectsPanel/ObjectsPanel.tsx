//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { type TypedObject, useQuery, QueryOptions } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer, Searchbar } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  // TODO(burdon): Structured query (e.g., "type:Text").
  const matcher = new RegExp(text, 'i');
  return (item: TypedObject) => {
    const model = item.toJSON()['@model'];
    let match = false;
    match ||= !!model?.match(matcher);
    match ||= !!item.__typename?.match(matcher);
    match ||= !!String(item.title).match(matcher);
    return match;
  };
};

const { helper, builder } = createColumnBuilder<TypedObject>();
const columns: TableColumnDef<TypedObject, any>[] = [
  helper.display(builder.selectRow()),
  helper.accessor((item) => PublicKey.from(item.id), { id: 'id', ...builder.key({ tooltip: true }) }),
  helper.accessor((item) => item.toJSON()['@model'], { id: 'model', size: 220 }),
  helper.accessor((item) => item.__typename, { id: 'type', size: 220 }),
  helper.accessor((item) => (item.__deleted ? 'deleted' : ''), { id: 'deleted', size: 80 }),
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
      <MasterDetailTable<TypedObject>
        columns={columns}
        data={items.filter(textFilter(filter))}
        widths={['w-auto min-w-[30%]', 'w-auto']}
      />
    </PanelContainer>
  );
};
