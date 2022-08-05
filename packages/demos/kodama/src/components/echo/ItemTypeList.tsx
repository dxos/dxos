//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

import { PARTY_ITEM_TYPE, Party } from '@dxos/client';
import { useSelection } from '@dxos/react-client';

import { List } from '../util';

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

export const ItemTypeList: FC<{
  party: Party
  onChange: (type: string) => void
}> = ({
  party,
  onChange
}) => {
  const types = useTypes(party);

  return (
    <List
      items={types.map(type => ({ id: type, text: type }))}
      onSelect={id => onChange(id)}
    />
  );
};
