//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Filter, type ReactiveEchoObject } from '@dxos/echo-db';
import { getSchema, getType, getTypename, isDeleted } from '@dxos/live-object';
import { QueryOptions, useQuery } from '@dxos/react-client/echo';
import { AnchoredOverflow, Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, Table, type TableColumnDef, textPadding } from '@dxos/react-ui-table/deprecated';

import { getSchemaVersion, type ObjectId } from '@dxos/echo-schema';
import { mx } from '@dxos/react-ui-theme';
import { JsonView, PanelContainer, Searchbar } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';
import { styles } from '../../../styles';

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  // TODO(burdon): Structured query (e.g., "type:Text").
  const matcher = new RegExp(text, 'i');
  return (item: ReactiveEchoObject<any>) => {
    let match = false;
    match ||= !!getType(item)?.objectId.match(matcher);
    match ||= !!String((item as any).title ?? '').match(matcher);
    return match;
  };
};

const { helper, builder } = createColumnBuilder<ReactiveEchoObject<any>>();
const columns: TableColumnDef<ReactiveEchoObject<any>, any>[] = [
  helper.accessor(
    'id',
    builder.string({
      header: 'id',
      accessorFn: (item) => trimId(item.id),
      size: 140,
      // TODO(dmaretskyi): font-mono doesn't work.
      meta: { cell: { classNames: ['font-mono'] } },
    }),
  ),
  helper.accessor((item) => (isDeleted(item) ? '❌' : ' '), {
    id: 'deleted',
    size: 80,
    meta: { cell: { classNames: [textPadding, 'text-center'] } },
  }),
  helper.accessor((item) => getTypename(item), {
    id: 'type',
    ...builder.string(),
  }),
  helper.accessor((item) => (getSchema(item) ? getSchemaVersion(getSchema(item)!) : undefined), {
    id: 'version',
    size: 80,
    ...builder.string(),
  }),
  helper.accessor((item) => (!!getSchema(item) ? 'YES' : 'NO'), {
    id: 'Schema Available',
    ...builder.string(),
    size: 80,
  }),
];

export const ObjectsPanel = () => {
  const { space } = useDevtoolsState();
  // TODO(burdon): Sort by type?
  const items = useQuery(space, Filter.all(), { deleted: QueryOptions.ShowDeletedOption.SHOW_DELETED });
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<ReactiveEchoObject<any>>();

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
          <Searchbar onChange={setFilter} />
        </Toolbar.Root>
      }
    >
      <div className={mx('flex grow', 'flex-col divide-y', 'overflow-hidden', styles.border)}>
        <Table.Root>
          <Table.Viewport asChild>
            <div className='flex-col divide-y'>
              <Table.Main<ReactiveEchoObject<any>>
                columns={columns}
                data={items.filter(textFilter(filter))}
                rowsSelectable
                currentDatum={selected}
                onDatumClick={setSelected}
                fullWidth
              />
            </div>
          </Table.Viewport>
        </Table.Root>

        <div className={mx('flex overflow-auto', 'h-1/2')}>{selected ? <JsonView data={selected} /> : 'Details'}</div>
      </div>
      <div
        className={mx(
          'bs-[--statusbar-size]',
          'flex justify-end items-center gap-2',
          'bg-base text-description',
          'border-bs border-separator',
          'text-lg pointer-fine:text-xs',
        )}
      >
        <div>Objects: {items.length}</div>
      </div>
    </PanelContainer>
  );
};

const trimId = (id: ObjectId) => `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
