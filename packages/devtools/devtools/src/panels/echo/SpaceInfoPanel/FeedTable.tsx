//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type PublicKey } from '@dxos/keys';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { AnchoredOverflow } from '@dxos/react-ui';
import { createColumnBuilder, Table, type TableColumnDef } from '@dxos/react-ui-table/deprecated';

import { Bitbar } from '../../../components';
import { useDevtoolsDispatch, useDevtoolsState } from '../../../hooks';

type FeedInfo = {
  feedKey: PublicKey;
  downloaded: Uint8Array;
  maxLength: number;
};

const { helper, builder } = createColumnBuilder<FeedInfo>();
const columns: TableColumnDef<FeedInfo, any>[] = [
  helper.accessor('feedKey', builder.key({ tooltip: true })),
  helper.accessor('downloaded', {
    cell: (cell) => (
      <Bitbar value={cell.getValue()} length={cell.row.original.maxLength} size={6} margin={1} height={8} />
    ),
  }),
];

export type FeedTableProps = {
  onSelect?: (feed: FeedInfo | undefined) => void;
};

export const FeedTable: FC<FeedTableProps> = ({ onSelect }) => {
  const { space } = useDevtoolsState();
  const setContext = useDevtoolsDispatch();

  // TODO(burdon): Constant updates.
  // TODO(burdon): Out of order with main table.
  const feedKeys = [
    ...(space?.internal.data.pipeline?.controlFeeds ?? []),
    ...(space?.internal.data.pipeline?.dataFeeds ?? []),
  ];
  const devtoolsHost = useDevtools();
  const { feeds = [] } = useStream(() => devtoolsHost.subscribeToFeeds({ feedKeys }), {}, [feedKeys]);
  const maxLength = feeds.reduce((max, feed) => (feed?.length > max ? feed.length : max), 0);
  const updatedFeeds = feeds.map((feed) => ({ ...feed, maxLength }));

  const handleSelect = (selected: FeedInfo | undefined) => {
    setContext((ctx) => ({ ...ctx, feedKey: selected?.feedKey }));
    onSelect?.(selected);
  };

  return (
    <Table.Root>
      <Table.Viewport classNames='overflow-anchored'>
        <Table.Main<FeedInfo> columns={columns} data={updatedFeeds} onDatumClick={handleSelect} fullWidth />
        <AnchoredOverflow.Anchor />
      </Table.Viewport>
    </Table.Root>
  );
};
