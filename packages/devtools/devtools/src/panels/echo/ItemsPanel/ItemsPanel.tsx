//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Toolbar } from '@dxos/aurora';
import { createColumnBuilder, GridColumnDef } from '@dxos/aurora-grid';
import { PublicKey } from '@dxos/keys';
import { TypedObject, useQuery } from '@dxos/react-client/echo';

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
const columns: GridColumnDef<TypedObject, any>[] = [
  helper.accessor((item) => PublicKey.from(item.id), { id: 'id', ...builder.createKey({ tooltip: true }) }),
  helper.accessor((item) => item.toJSON()['@model'], { id: 'model' }),
  helper.accessor((item) => item.__typename, { id: 'type' }),
];

export const ItemsPanel = () => {
  const { space } = useDevtoolsState();
  // TODO(burdon): Sort by type?
  // TODO(burdon): Filter deleted.
  const items = useQuery(space);
  const [filter, setFilter] = useState('');

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <SpaceSelector />
          <Searchbar onSearch={setFilter} />
        </Toolbar.Root>
      }
    >
      <MasterDetailTable<TypedObject> columns={columns} data={items.filter(textFilter(filter))} />
    </PanelContainer>
  );
};
