//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { type EchoReactiveObject, getType, isDeleted } from '@dxos/echo-schema';
import { QueryOptions, useQuery } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef, textPadding } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer, Searchbar } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  // TODO(burdon): Structured query (e.g., "type:Text").
  const matcher = new RegExp(text, 'i');
  return (item: EchoReactiveObject<any>) => {
    let match = false;
    match ||= !!getType(item)?.objectId.match(matcher);
    match ||= !!String((item as any).title ?? '').match(matcher);
    return match;
  };
};

const describeContent = (obj: EchoReactiveObject<any>): string => {
  if ('name' in obj) {
    return obj.name;
  }
  if ('content' in obj && typeof obj.content === 'string') {
    const maxLength = 30;
    return obj.content.length < maxLength ? obj.content : `${obj.content.substring(0, maxLength)}...`;
  }
  return '';
};

const { helper, builder } = createColumnBuilder<EchoReactiveObject<any>>();
const columns: TableColumnDef<EchoReactiveObject<any>, any>[] = [
  helper.accessor('id', builder.string({ header: 'id' })),
  helper.accessor((item) => getType(item)?.objectId, {
    id: 'type',
    ...builder.string(),
  }),
  helper.accessor((item) => describeContent(item), {
    id: 'content',
    ...builder.string(),
  }),
  helper.accessor((item) => (isDeleted(item) ? '✅' : '❎'), {
    id: 'deleted',
    meta: { cell: { classNames: [textPadding, 'text-center'] } },
    size: 50,
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
          <DataSpaceSelector />
          <Searchbar onChange={setFilter} />
        </Toolbar.Root>
      }
    >
      <MasterDetailTable<EchoReactiveObject<any>>
        columns={columns}
        data={items.filter(textFilter(filter))}
        statusBar={<div>Objects: {items.length}</div>}
      />
    </PanelContainer>
  );
};
