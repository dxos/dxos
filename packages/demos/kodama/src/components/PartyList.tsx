//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { FC, useEffect, useState } from 'react';

import { Party, PartyKey } from '@dxos/client';
import { useClient, useParties } from '@dxos/react-client';

import { ItemList } from './ItemList';

const PartyListItem: FC<{
  party?: Party,
  onUpdate?: (key: PartyKey | undefined, text: string) => void
  onSelect?: (key: PartyKey) => void
}> = ({
  party,
  onUpdate,
  onSelect
}) => {
  const { isFocused } = useFocus({ id: party?.key.toHex() });
  const [text, setText] = useState(party?.getProperty('title'));

  const handleSubmit = (text: string) => {
    if (text.trim().length) {
      if (!party) {
        setText('');
      }

      if (text !== party?.getProperty('title')) {
        onUpdate?.(party?.key, text);
      } else {
        onSelect?.(party?.key);
      }
    }
  };

  return (
    <Box>
      <Text color='green'>{isFocused ? '> ' : party ? '  ' : '+ '}</Text>
      {isFocused && (
        <TextInput
          placeholder={ party ? undefined : 'Create party' }
          value={text || ''}
          onChange={setText}
          onSubmit={handleSubmit}
        />
      )}
      {!isFocused && party && (
        <Text>{text}</Text>
      )}
    </Box>
  );
};

export const PartyList: FC<{
  partyKey?: PartyKey,
  onExit: () => void
}> = ({
  partyKey: controlledPartyKey,
  onExit
}) => {
  const [partyKey, setPartyKey] = useState<PartyKey | undefined>(controlledPartyKey);
  const { focusNext, focusPrevious } = useFocusManager();
  const parties = useParties();
  const client = useClient();

  // TODO(burdon): Focus last party key (on return).
  useEffect(() => {
    focusNext();
  }, [partyKey]);

  useInput((input, key) => {
    if (!partyKey && key.escape) {
      onExit();
    }
    if (key.upArrow) {
      focusPrevious();
    }
    if (key.downArrow) {
      focusNext();
    }
  });

  const handleUpdate = (partyKey: PartyKey | undefined, text: string) => {
    if (partyKey) {
      const party = parties.find(party => party.key.equals(partyKey));
      void party!.setProperty('title', text);
    } else {
      setImmediate(async () => {
        const party = await client.echo.createParty();
        void party.setProperty('title', text);
        setPartyKey(party.key);
      });
    }
  };

  if (partyKey) {
    return (
      <ItemList
        partyKey={partyKey}
        onExit={() => {
          setPartyKey(undefined);
        }}
      />
    );
  }

  return (
    <Box flexDirection='column' borderStyle='single' borderColor='#333'>
      {parties.length !== 0 && (
        <>
          <Text color='green'>Parties</Text>
          <Box flexDirection='column' marginBottom={1}>
            {parties.map(party => (
              <PartyListItem
                key={party.key.toHex()}
                party={party}
                onSelect={(partyKey: PartyKey) => setPartyKey(partyKey)}
                onUpdate={handleUpdate}
              />
            ))}
          </Box>
        </>
      )}

      <PartyListItem
        onUpdate={handleUpdate}
      />
    </Box>
  );
};
