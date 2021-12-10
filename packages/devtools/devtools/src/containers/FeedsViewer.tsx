//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';

import { PartyProxy } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';
import { useClient, useParties } from '@dxos/react-client';

import { useStream } from '../hooks';
import { MessageTable, PartySelect } from '../components';

export const FeedsViewer = () => {
  const parties = useParties();
  const [selectedParty, setSelectedParty] = useState<PartyProxy>();

  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;

  const result = useStream(() => devtoolsHost.SubscribeToFeeds({}));
  const partyFeeds = result?.parties?.find(({ key }) => selectedParty?.key && key?.equals(selectedParty.key))?.feeds;
  const [selectedFeed, setSelectedFeed] = useState<PublicKey>();

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
    setMessages([]);
    setSelectedFeed(undefined);
    setSelectedParty(party);
  };

  const handleFeedChange = (event: SelectChangeEvent<string>) => {
    setMessages([]);

    if (!partyFeeds) {
      setSelectedFeed(undefined);
      return;
    }

    setSelectedFeed(partyFeeds?.find(feedKey => feedKey.equals(event.target.value)));
  };

  return (
    <>
      <Box sx={{ margin: 2 }}>
        <PartySelect
          parties={parties}
          value={selectedParty}
          onChange={handlePartyChange}
        />
      </Box>
      <Box sx={{ margin: 2 }}>
        <FormControl fullWidth>
          <InputLabel id='feed-select'>Feed</InputLabel>
          <Select
            id='feed-select'
            label='Feed'
            variant='standard'
            value={selectedFeed?.toHex() ?? ''}
            onChange={handleFeedChange}
          >
            {partyFeeds?.map(feedKey => (
              <MenuItem key={feedKey.toHex()} value={feedKey.toHex()}>
                {feedKey.toHex()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <MessageTable
        messages={messages}
      />
    </>
  );
};
