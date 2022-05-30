//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { useClient, useParties } from '@dxos/react-client';

import { KeySelect, MessageTable, Panel } from '../../components';
import { useStream } from '../../hooks';

export const FeedsPanel = () => {
  const client = useClient();
  const parties = useParties();
  const [selectedPartyKey, setSelectedPartyKey] = useState<PublicKey>();
  const [selectedFeed, setSelectedFeed] = useState<PublicKey>();
  const { parties: remoteParties } = useStream(() => devtoolsHost.subscribeToFeeds({})) ?? {};
  const partyFeeds = useMemo(
    () => remoteParties?.find(({ key }) => selectedPartyKey && key?.equals(selectedPartyKey))?.feeds ?? [],
    [remoteParties, selectedPartyKey]
  );

  const devtoolsHost = client.services.DevtoolsHost;

  // TODO(wittjosiah): EchoFeedBlock.
  const [messages, setMessages] = useState<any[]>([]);
  const { blocks } = useStream(
    () => devtoolsHost.subscribeToFeed({ partyKey: selectedPartyKey, feedKey: selectedFeed }),
    [selectedPartyKey, selectedFeed]
  ) ?? {};

  useEffect(() => {
    if (blocks) {
      setMessages([...messages, ...blocks]);
    }
  }, [blocks]);

  const handlePartyChange = (key: PublicKey | undefined) => {
    setSelectedPartyKey(key);
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
        <KeySelect
          id='party-select'
          label='Party'
          keys={parties.map(({ key }) => key)}
          selected={selectedPartyKey}
          onChange={handlePartyChange}
        />
        <KeySelect
          id='feed-select'
          label='Feed'
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
