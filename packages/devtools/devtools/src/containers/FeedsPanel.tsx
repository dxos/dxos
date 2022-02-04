//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Party } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';
import { useClient, useParties } from '@dxos/react-client';

import { Panel, FeedSelect, MessageTable, PartySelect } from '../components';
import { useStream } from '../hooks';

export const FeedsPanel = () => {
  const client = useClient();
  const parties = useParties();
  const [selectedParty, setSelectedParty] = useState<Party>();
  const [selectedFeed, setSelectedFeed] = useState<PublicKey>();
  const { parties: remoteParties } = useStream(() => devtoolsHost.subscribeToFeeds({})) ?? {};
  const partyFeeds = useMemo(
    () => remoteParties?.find(({ key }) => selectedParty?.key && key?.equals(selectedParty.key))?.feeds ?? [],
    [remoteParties, selectedParty]
  );

  const devtoolsHost = client.services.DevtoolsHost;

  // TODO(wittjosiah): EchoFeedBlock.
  const [messages, setMessages] = useState<any[]>([]);
  const { blocks } = useStream(
    () => devtoolsHost.subscribeToFeed({ partyKey: selectedParty?.key, feedKey: selectedFeed }),
    [selectedParty?.key, selectedFeed]
  ) ?? {};

  useEffect(() => {
    if (blocks) {
      setMessages([...messages, ...blocks]);
    }
  }, [blocks]);

  const handlePartyChange = (party: Party | undefined) => {
    setSelectedParty(party);
    setSelectedFeed(undefined);
    setMessages([]);
  };

  const handleFeedChange = (feedKey: PublicKey | undefined) => {
    setSelectedFeed(feedKey);
    setMessages([]);
  };

  return (
    <Panel controls={(
      <>
        <PartySelect
          parties={parties}
          selected={selectedParty}
          onChange={handlePartyChange}
        />
        <FeedSelect
          keys={partyFeeds}
          selected={selectedFeed}
          onChange={handleFeedChange}
        />
      </>
    )}>
      <MessageTable
        messages={messages}
      />
    </Panel>
  );
};
