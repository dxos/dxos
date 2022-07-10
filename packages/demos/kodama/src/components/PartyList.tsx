//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { FC, useEffect, useState } from 'react';

import { ItemList } from './ItemList';

import { Party, PartyKey } from '../types';

const PartyListItem: FC<{
  party?: Party,
  onUpdate?: (key: PartyKey | undefined, text: string) => void
  onSelect?: (key: PartyKey) => void
}> = ({
  party,
  onUpdate,
  onSelect
}) => {
  const { isFocused } = useFocus({ id: party?.key }); // TODO(burdon): to String and set focus on return.
  const [text, setText] = useState(party?.title);

  const handleSubmit = (text: string) => {
    if (text.trim().length) {
      if (!party) {
        setText('');
      }

      if (text !== party?.title) {
        onUpdate?.(party?.key, text);
      } else {
        onSelect?.(party?.key);
      }
    }
  }

  return (
    <Box>
      <Text color='blue'>{isFocused ? '> ' : party ? '  ' : '+ '}</Text>
      {isFocused && (
        <TextInput
          placeholder='Create party'
          value={text || ''}
          onChange={setText}
          onSubmit={handleSubmit}
        />
      ) || party && (
        <Text>{party.title}</Text>
      )}
    </Box>
  );
};

export const PartyList: FC<{
  onExit: () => void
}> = ({
  onExit
}) => {
  const [list, setList] = useState<Party[]>([]);
  const [partyKey, setPartyKey] = useState<PartyKey>();
	const { focus, focusNext } = useFocusManager();

  // TODO(burdon): Focus last party key (on return).
  useEffect(() => {
    focusNext();
  }, [partyKey]);

  useInput((input, key) => {
    if (!partyKey && key.escape) {
      onExit();
    }
  });

  const handleUpdate = (partyKey: PartyKey | undefined, text: string) => {
    if (partyKey) {
      setList(list => {
        const newList = list.map(party => {
          if (party.key === partyKey) {
            return {
              ...party,
              title: text
            }
          } else {
            return party;
          }
        });

        return [...newList];
      });
    } else {
      const party = {
        key: String(Date.now()),
        title: text
      };

      setList(list => [...list, party]);
      setPartyKey(party.key);
    }
  }

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
    <Box flexDirection='column'>
      {list.map(party => (
        <PartyListItem
          key={party.key}
          party={party}
          onSelect={(partyKey: PartyKey) => setPartyKey(partyKey)}
          onUpdate={handleUpdate}
        />
      ))}

      <PartyListItem
        onUpdate={handleUpdate}
      />
    </Box>
  );
};
