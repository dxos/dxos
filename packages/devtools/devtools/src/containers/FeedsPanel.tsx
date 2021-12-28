//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { PartyProxy } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';
import { useClient, useParties } from '@dxos/react-client';

import { Panel, FeedSelect, MessageTable, PartySelect } from '../components';
import { useStream } from '../hooks';

export const FeedsPanel = () => {
  const client = useClient();
  const parties = useParties();
  const [selectedParty, setSelectedParty] = useState<PartyProxy>();
  const [selectedFeed, setSelectedFeed] = useState<PublicKey>();
  const feeds = useStream(() => devtoolsHost.SubscribeToFeeds({}));
  const partyFeeds = useMemo(
    () => feeds?.parties?.find(({ key }) => selectedParty?.key && key?.equals(selectedParty.key))?.feeds ?? [],
    [feeds, selectedParty]);

  const devtoolsHost = client.services.DevtoolsHost;

  // TODO(wittjosiah): EchoFeedBlock.
  const [messages, setMessages] = useState<any[]>([]);
  const feed = useStream(
    () => devtoolsHost.SubscribeToFeed({ partyKey: selectedParty?.key, feedKey: selectedFeed }),
    [selectedParty?.key, selectedFeed]
  );

  useEffect(() => {
    if (feed?.blocks) {
      setMessages([...messages, ...feed.blocks]);
    }
  }, [feed?.blocks]);

  const handlePartyChange = (party: PartyProxy | undefined) => {
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
