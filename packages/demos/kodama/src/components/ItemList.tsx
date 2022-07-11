//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { FC, useEffect, useState } from 'react';

import { Item, ItemID, ObjectModel, Party, PartyKey } from '@dxos/client';
import { useMembers, useParty, useSelection } from '@dxos/react-client';

import { ShareParty } from './ShareParty';

const TYPE_ITEM = 'dxos:type/item';

const PartyInfo: FC<{
  party: Party
}> = ({
  party
}) => {
  const members = useMembers(party);

  return (
    <Box flexDirection='column' borderStyle='single' borderColor='#333'>
      <Text color='blue'>Party</Text>
      <Box>
        <Text color='blue'>  Title: </Text>
        <Text>{party.getProperty('title')}</Text>
      </Box>
      <Box>
        <Text color='blue'>  Public Key: </Text>
        <Text>{party.key.toHex()}</Text>
      </Box>

      <Text color='blue'>  Members:</Text>
      {members.map(member => (
        <Text key={member.publicKey.toHex()}>  - {member.displayName}</Text>
      ))}
    </Box>
  );
};

const ItemListItem: FC<{
  item?: Item<ObjectModel>,
  onUpdate?: (itemId: ItemID | undefined, text: string) => void
}> = ({
  item,
  onUpdate
}) => {
  const { isFocused } = useFocus();
  const [text, setText] = useState(item?.model.get('title'));

  // TODO(burdon): Delete item (meta-delete).
  // TODO(burdon): Hierarchical item editor.
  // TODO(burdon): Hierarchical properties editor.

  const handleSubmit = (text: string) => {
    if (text.trim().length) {
      if (!item) {
        setText('');
      }

      onUpdate?.(item?.id, text);
    }
  }

  useEffect(() => {
    if (text) {
      handleSubmit(text);
    }
  }, [isFocused]);

  return (
    <Box>
      <Text color='green'>{isFocused ? '> ' : item ? '  ' : '+ '}</Text>
      {isFocused && (
        <TextInput
          value={text || ''}
          onChange={setText}
          onSubmit={handleSubmit}
        />
      ) || (
        <Text>{text}</Text>
      )}
    </Box>
  );
};

export const ItemList: FC<{
  partyKey: PartyKey,
  onExit: () => void
}> = ({
  partyKey,
  onExit
}) => {
	const { focusNext } = useFocusManager();
  const party = useParty(partyKey)!;
  const [pending, setPending] = useState(false);

  // TODO(burdon): Clean-up API (e.g., default value).
  // TODO(burdon): Not updated if model properties change (e.g., set title).
  const items = useSelection(party?.select().filter({ type: TYPE_ITEM }), [partyKey]) ?? [];

  useEffect(() => {
    focusNext();
  }, [party]);

  useInput((input, key) => {
    if (key.escape) {
      onExit();
    }
  });

  const handleUpdate = (itemId: ItemID | undefined, text: string) => {
    if (itemId) {
      const item = party.database.getItem(itemId)!;
      item.model.set('title', text);
    } else {
      party.database.createItem({
        type: TYPE_ITEM,
        props: {
          title: text
        }
      });
    }
  }

  if (!party) {
    return null;
  }

  return (
    <Box flexDirection='column'>
      <PartyInfo party={party} />

      {!pending && (
        <Box flexDirection='column' borderStyle='single' borderColor='#333'>
          <Text color='green'>Items</Text>
          {items.map(item => (
            <ItemListItem
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
            />
          ))}

          <ItemListItem
            onUpdate={handleUpdate}
          />
        </Box>
      )}

      <ShareParty
        party={party}
        onStateChanged={setPending}
      />
    </Box>
  );
};
