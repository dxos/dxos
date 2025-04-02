//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';

import { useDevtoolsDispatch, useDevtoolsState } from '../../../hooks';
import { createTextBitbar } from '../../../util';

type FeedInfo = {
  feedKey: PublicKey;
  downloaded: Uint8Array;
  maxLength: number;
};

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

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'feedKey', format: FormatEnum.DID },
      { name: 'progress', format: FormatEnum.String, size: 420 },
    ],
    [],
  );

  const tableData = useMemo(() => {
    return feeds.map((feed) => ({
      id: feed.feedKey.toString(),
      feedKey: feed.feedKey.toString(),
      progress: createTextBitbar(feed.downloaded, maxLength),
      _original: { ...feed, maxLength },
    }));
  }, [feeds, maxLength]);

  const handleRowClick = (row: any) => {
    if (row?._original !== undefined) {
      setContext((ctx) => ({ ...ctx, feedKey: row._original?.feedKey }));
      onSelect?.(row._original);
    }
  };

  return <DynamicTable properties={properties} data={tableData} onRowClicked={handleRowClick} />;
};
