//
// Copyright 2020 DXOS.org
//

import { ArrowClockwise } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { generateName } from '@dxos/display-name';
import { type PublicKey } from '@dxos/keys';
import { type Contact } from '@dxos/protocols/proto/dxos/client/services';
import {
  type SubscribeToFeedBlocksResponse,
  type SubscribeToFeedsResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';
import { type Client, useClient } from '@dxos/react-client';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { useContacts } from '@dxos/react-client/halo';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table';
import { getSize } from '@dxos/react-ui-theme';

import { Bitbar, MasterDetailTable, PanelContainer, PublicKeySelector } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useFeedMessages } from '../../../hooks';

type FeedTableRow = SubscribeToFeedBlocksResponse.Block & {
  type: string;
  issuer: string;
};

const { helper, builder } = createColumnBuilder<FeedTableRow>();
const columns: TableColumnDef<FeedTableRow, any>[] = [
  helper.accessor('type', builder.string({})),
  helper.accessor('issuer', builder.string({})),
  helper.accessor('feedKey', builder.key({ header: 'key', tooltip: true })),
  helper.accessor('seq', builder.number({})),
];

export const FeedsPanel = () => {
  const devtoolsHost = useDevtools();
  const setContext = useDevtoolsDispatch();
  const { space, feedKey } = useDevtoolsState();
  const feedMessages = useFeedMessages({ feedKey }).reverse();
  const contacts = useContacts();
  const client = useClient();

  const [refreshCount, setRefreshCount] = useState(0);
  const feedKeys = [
    ...(space?.internal.data.pipeline?.controlFeeds ?? []),
    ...(space?.internal.data.pipeline?.dataFeeds ?? []),
  ];
  const { feeds } = useStream(() => devtoolsHost.subscribeToFeeds({ feedKeys }), {}, [refreshCount]);
  const feed = feeds?.find((feed) => feedKey && feed.feedKey.equals(feedKey));
  const tableRows = mapToRows(client, space?.key, contacts, feedMessages);

  // TODO(burdon): Not updated in realtime.
  // Hack to select and refresh first feed.
  const key = feedKey ?? feedKeys[0];
  useEffect(() => {
    if (key && !feedKey) {
      handleSelect(key);
      setTimeout(() => {
        handleRefresh();
      });
    }
  }, [key]);

  useEffect(() => {
    if (feedKey && feedKeys.length > 0 && !feedKeys.find((feed) => feed.equals(feedKey))) {
      handleSelect(feedKeys[0]);
    }
  }, [JSON.stringify(feedKeys), feedKey]);

  const handleSelect = (feedKey?: PublicKey) => {
    setContext((state) => ({ ...state, feedKey }));
    setTimeout(() => {
      handleRefresh();
    });
  };

  const handleRefresh = () => {
    setRefreshCount(refreshCount + 1);
  };

  const getLabel = (key: PublicKey) => {
    const feed = feeds?.find((feed) => feed.feedKey.equals(key));
    const feedLength = feed ? ` (${feed.length})` : '';
    return `${formatIdentity(client, contacts, feed?.owner)}${feedLength}`;
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
          <PublicKeySelector
            placeholder='Select feed'
            getLabel={getLabel}
            keys={feedKeys}
            value={key}
            onChange={handleSelect}
          />

          <Toolbar.Button onClick={handleRefresh}>
            <ArrowClockwise className={getSize(5)} />
          </Toolbar.Button>
        </Toolbar.Root>
      }
    >
      <div className='flex flex-col overflow-hidden'>
        <Bitbar value={feed?.downloaded ?? new Uint8Array()} length={feed?.length ?? 0} className='m-4' />
        <MasterDetailTable<FeedTableRow> columns={columns} data={tableRows} />
      </div>
    </PanelContainer>
  );
};

const mapToRows = (
  client: Client,
  spaceKey: PublicKey | undefined,
  contacts: Contact[],
  blocks: SubscribeToFeedBlocksResponse.Block[],
): FeedTableRow[] => {
  return blocks.map((block) => {
    const credential = block.data.payload.credential?.credential;
    const type = (credential?.subject?.assertion?.['@type'] as string) ?? 'unknown_type';
    const issuerKeys = credential ? { identity: credential.issuer, device: credential.proof!.signer } : undefined;
    return {
      type,
      issuer: issuerKeys ? formatIdentity(client, contacts, issuerKeys) : 'unknown',
      ...block,
    };
  });
};

const formatIdentity = (
  client: Client,
  contacts: Contact[],
  identityInfo: SubscribeToFeedsResponse.FeedOwner | undefined,
): string => {
  if (!identityInfo) {
    return 'unknown';
  }
  let identityName;
  if (client.halo.identity.get()?.identityKey?.equals(identityInfo.identity)) {
    identityName = client.halo.device?.deviceKey.equals(identityInfo.device) ? 'this device' : 'my device';
  } else {
    const ownerContact = identityInfo && contacts.find((contact) => contact.identityKey.equals(identityInfo.identity));
    identityName = ownerContact?.profile?.displayName ?? generateName(identityInfo.identity.toHex());
  }
  return `${identityName} (${identityInfo.device.truncate()})`;
};
