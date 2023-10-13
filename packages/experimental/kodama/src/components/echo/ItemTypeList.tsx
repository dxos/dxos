//
// Copyright 2022 DXOS.org
//

import React, { type FC } from 'react';

import { todo } from '@dxos/debug';
import { type Space } from '@dxos/react-client/echo';

import { List } from '../util';

// TODO(burdon): Move into react-client.
const useTypes = (space?: Space) => {
  // const [types, setTypes] = useState<Set<string>>(new Set());
  // const items = useSelection(space?.select()) ?? [];

  // useEffect(() => {
  //   const types = new Set<string>();
  //   items.forEach((item) => item.type && item.type !== SPACE_ITEM_TYPE && types.add(item.type));
  //   setTypes(types);
  // }, [items]);

  // return Array.from(types);
  return todo() as any;
};

export const ItemTypeList: FC<{
  space: Space;
  onChange: (type: string) => void;
}> = ({ space, onChange }) => {
  const types = useTypes(space);

  return (
    <List
      id={'item-type-list'}
      items={types.map((type: any) => ({ id: type, text: type }))}
      onSelect={(id) => onChange(id)}
    />
  );
};
