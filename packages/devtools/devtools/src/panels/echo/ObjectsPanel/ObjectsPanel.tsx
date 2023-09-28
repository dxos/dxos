//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Toolbar } from '@dxos/aurora';
import { createColumnBuilder, TableColumnDef } from '@dxos/aurora-table';
// import { ShowDeletedOption } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ShowDeletedOption, TypedObject, useQuery } from '@dxos/react-client/echo';

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
  helper.accessor((item) => PublicKey.from(item.id), { id: 'id', ...builder.key({ tooltip: true }) }),
  helper.accessor((item) => item.toJSON()['@model'], { id: 'model', size: 220 }),
  helper.accessor((item) => item.__typename, { id: 'type', size: 220 }),
  helper.accessor((item) => (item.__deleted ? 'deleted' : ''), { id: 'deleted', size: 80 }),
];

export const ObjectsPanel = () => {
  const { space } = useDevtoolsState();
  // TODO(burdon): Sort by type?
  const items = useQuery(space, {}, { deleted: ShowDeletedOption.SHOW_DELETED });
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
        widths={['w-auto', 'w-auto']}
      />
    </PanelContainer>
  );
};
