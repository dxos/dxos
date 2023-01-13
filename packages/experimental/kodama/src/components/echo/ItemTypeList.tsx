//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

import { SPACE_ITEM_TYPE, Space } from '@dxos/client';
import { useSelection } from '@dxos/react-client';

import { List } from '../util';

// TODO(burdon): Move into react-client.
const useTypes = (space?: Space, deps: any[] = []) => {
  const [types, setTypes] = useState<Set<string>>(new Set());
  const items = useSelection(space?.select(), deps) ?? [];

  useEffect(() => {
    const types = new Set<string>();
    items.forEach((item) => item.type && item.type !== SPACE_ITEM_TYPE && types.add(item.type));
    setTypes(types);
  }, [items]);

  return Array.from(types);
};

export const ItemTypeList: FC<{
  space: Space;
  onChange: (type: string) => void;
}> = ({ space, onChange }) => {
  const types = useTypes(space);

  return (
    <List
      id={'item-type-list'}
      items={types.map((type) => ({ id: type, text: type }))}
      onSelect={(id) => onChange(id)}
    />
  );
};
