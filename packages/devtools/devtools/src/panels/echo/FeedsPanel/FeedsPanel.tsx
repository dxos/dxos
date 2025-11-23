//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { generateName } from '@dxos/display-name';
import { Format } from '@dxos/echo';
import { type PublicKey } from '@dxos/keys';
import { type Contact } from '@dxos/protocols/proto/dxos/client/services';
import {
  type SubscribeToFeedBlocksResponse,
  type SubscribeToFeedsResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';
import { type Client, useClient } from '@dxos/react-client';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { type Space } from '@dxos/react-client/echo';
import { useContacts } from '@dxos/react-client/halo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { Bitbar, MasterDetailTable, PanelContainer, PublicKeySelector } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useFeedMessages } from '../../../hooks';

type FeedTableRow = SubscribeToFeedBlocksResponse.Block & {
  type: string;
  issuer: string;
};

export const FeedsPanel = (props: { space?: Space }) => {
  const devtoolsHost = useDevtools();
  const setContext = useDevtoolsDispatch();
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const feedKey = state.feedKey;
  const feedMessages = useFeedMessages({ feedKey, maxBlocks: 1000 }).reverse();
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
  }, [JSON.stringify(feedKeys), feedKey]); // TODO(burdon): Avoid stringify.

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

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'type', format: Format.TypeFormat.String },
      { name: 'issuer', format: Format.TypeFormat.String },
      { name: 'feedKey', format: Format.TypeFormat.JSON, size: 180 },
      { name: 'seq', format: Format.TypeFormat.Number, size: 80 },
    ],
    [],
  );

  const tableData = useMemo(() => {
    return tableRows.map((row) => ({
      id: `${row.feedKey.toHex()}-${row.seq}`,
      ...row,
    }));
  }, [tableRows]);

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {!props.space && <DataSpaceSelector />}
          <PublicKeySelector
            placeholder='Select feed'
            getLabel={getLabel}
            keys={feedKeys}
            value={key}
            onChange={handleSelect}
          />

          <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' onClick={handleRefresh} />
        </Toolbar.Root>
      }
    >
      <div className='bs-full'>
        <Bitbar value={feed?.downloaded ?? new Uint8Array()} length={feed?.length ?? 0} className='m-4' />
        <MasterDetailTable properties={properties} data={tableData} detailsPosition='bottom' />
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
