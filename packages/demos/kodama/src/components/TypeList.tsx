//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus } from 'ink';
import SelectInput from 'ink-select-input';
import React, { FC, useEffect, useState } from 'react';

import { PARTY_ITEM_TYPE, Party } from '@dxos/client';
import { useSelection } from '@dxos/react-client';

// TODO(burdon): Move into react-client.
const useTypes = (party?: Party, deps: any[] = []) => {
  const [types, setTypes] = useState<Set<string>>(new Set());
  const items = useSelection(party?.select(), deps) ?? [];
  useEffect(() => {
    const types = new Set<string>();
    items.forEach(item => item.type && item.type !== PARTY_ITEM_TYPE && types.add(item.type));
    setTypes(types);
  }, [items]);

  return Array.from(types);
};

export const TypeList: FC<{
  party: Party,
  onChange: (type: string) => void
}> = ({
  party,
  onChange
}) => {
  const types = useTypes(party);
  const { isFocused } = useFocus();

  return (
    <Box flexDirection='column' borderStyle='single' borderColor='#333'>
      <Text color='green'>Types</Text>
      <SelectInput
        isFocused={isFocused}
        items={types.map(type => ({ value: type, label: type }))}
        onSelect={item => onChange(item.value)}
      />
    </Box>
  );
};
