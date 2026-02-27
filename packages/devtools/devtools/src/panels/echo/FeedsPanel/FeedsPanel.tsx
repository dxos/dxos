//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { generateName } from '@dxos/display-name';
import { Format } from '@dxos/echo/internal';
import { type PublicKey } from '@dxos/keys';
import { toPublicKey } from '@dxos/protocols/buf';
import { type Contact } from '@dxos/protocols/buf/dxos/client/services_pb';
import {
  type SubscribeToFeedBlocksResponse_Block,
  type SubscribeToFeedsResponse,
  type SubscribeToFeedsResponse_FeedOwner,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { type Client, useClient } from '@dxos/react-client';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { type Space } from '@dxos/react-client/echo';
import { useContacts } from '@dxos/react-client/halo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { Bitbar, MasterDetailTable, PanelContainer, PublicKeySelector } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useFeedMessages } from '../../../hooks';

type FeedTableRow = SubscribeToFeedBlocksResponse_Block & {
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
  const { feeds } = useStream(() => devtoolsHost.subscribeToFeeds({ feedKeys } as any), {} as any, [refreshCount]);
  const feed = feeds?.find(
    (feed: any) => feedKey && feed.feedKey && toPublicKey(feed.feedKey).equals(toPublicKey(feedKey)),
  );
  const tableRows = mapToRows(client, space?.key, contacts as any, feedMessages);

  // TODO(burdon): Not updated in realtime.
  // Hack to select and refresh first feed.
  const key = feedKey ?? feedKeys[0];
  useEffect(() => {
    if (key && !feedKey) {
      handleSelect(key as any);
      setTimeout(() => {
        handleRefresh();
      });
    }
  }, [key]);

  useEffect(() => {
    if (
      feedKey &&
      feedKeys.length > 0 &&
      !feedKeys.find((fk: any) => fk && toPublicKey(fk).equals(toPublicKey(feedKey)))
    ) {
      handleSelect(feedKeys[0] as any);
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
    const feed = feeds?.find((feed: any) => feed.feedKey && key && toPublicKey(feed.feedKey).equals(toPublicKey(key)));
    const feedLength = feed ? ` (${feed.length})` : '';
    return `${formatIdentity(client, contacts as any, feed?.owner)}${feedLength}`;
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
      id: `${row.feedKey ? toPublicKey(row.feedKey).toHex() : 'unknown'}-${row.seq}`,
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
            keys={feedKeys as any}
            value={key as any}
            onChange={handleSelect}
          />

          <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' onClick={handleRefresh} />
        </Toolbar.Root>
      }
    >
      <div className='h-full'>
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
  blocks: SubscribeToFeedBlocksResponse_Block[],
): FeedTableRow[] => {
  return blocks.map((block) => {
    const credentialMsg =
      block.data?.payload?.payload.case === 'credential' ? block.data.payload.payload.value : undefined;
    const credential = credentialMsg?.credential;
    const type = (credential?.subject?.assertion as any)?.['@type'] ?? 'unknown_type';
    const issuerKeys = credential
      ? ({ identity: credential.issuer, device: credential.proof?.signer } as any)
      : undefined;
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
  identityInfo: SubscribeToFeedsResponse_FeedOwner | undefined,
): string => {
  if (!identityInfo) {
    return 'unknown';
  }
  let identityName;
  const identityKey = client.halo.identity.get()?.identityKey;
  if (identityKey && identityInfo.identity && toPublicKey(identityKey).equals(toPublicKey(identityInfo.identity))) {
    identityName =
      identityInfo.device &&
      client.halo.device?.deviceKey &&
      toPublicKey(client.halo.device.deviceKey).equals(toPublicKey(identityInfo.device))
        ? 'this device'
        : 'my device';
  } else {
    const ownerContact =
      identityInfo &&
      contacts.find(
        (contact) =>
          contact.identityKey &&
          identityInfo.identity &&
          toPublicKey(contact.identityKey).equals(toPublicKey(identityInfo.identity)),
      );
    identityName =
      ownerContact?.profile?.displayName ??
      generateName(identityInfo.identity ? toPublicKey(identityInfo.identity).toHex() : '');
  }
  return `${identityName} (${identityInfo.device ? toPublicKey(identityInfo.device).truncate() : ''})`;
};
