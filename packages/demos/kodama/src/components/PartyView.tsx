//
// Copyright 2022 DXOS.org
//

import { Box, useInput, useFocus } from 'ink';
import { Tabs, Tab } from 'ink-tab';
import React, { FC, useState } from 'react';

import { PartyKey } from '@dxos/client';
import { useParty } from '@dxos/react-client';

import { Feeds } from './Feeds';
import { ItemList } from './ItemList';
import { PartyInfo } from './PartyInfo';
import { ShareParty } from './ShareParty';
import { TypeList } from './TypeList';

const SectionTabs: FC<{
  onChange: (id: string) => void
}> = ({
  onChange
}) => {
  const { isFocused } = useFocus();

  return (
    <Box flexDirection='column' borderStyle='single' borderColor='#333'>
      <Tabs
        isFocused={isFocused}
        showIndex={false}
        onChange={onChange}
      >
        {/* eslint-disable @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        <Tab name='items'>Items</Tab>
        {/* @ts-ignore */}
        <Tab name='types'>Types</Tab>
        {/* @ts-ignore */}
        <Tab name='feeds'>Feeds</Tab>
        {/* @ts-ignore */}
        <Tab name='sharing'>Sharing</Tab>
      </Tabs>
    </Box>
  );
};

export const PartyView: FC<{
  partyKey: PartyKey,
  onExit: () => void
}> = ({
  partyKey,
  onExit
}) => {
  const [tab, setTab] = useState('items');
  const [type, setType] = useState<string>();
  const party = useParty(partyKey);

  useInput((input, key) => {
    if (key.escape) {
      onExit();
    }
  });

  if (!party) {
    return null;
  }

  return (
    <Box flexDirection='column'>
      <PartyInfo
        party={party}
      />

      <SectionTabs
        onChange={setTab}
      />

      {tab === 'items' && (
        <ItemList
          party={party}
          type={type}
        />
      )}
      {tab === 'types' && (
        <TypeList
          party={party}
          onChange={setType}
        />
      )}
      {tab === 'feeds' && (
        <Feeds
          partyKey={party.key}
        />
      )}
      {tab === 'sharing' && (
        <ShareParty
          party={party}
        />
      )}
    </Box>
  );
};
