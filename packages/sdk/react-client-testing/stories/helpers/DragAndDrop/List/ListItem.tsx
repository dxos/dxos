//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties } from 'react';

export type ListItemDef = {
  id: string;
  title: string;
};

interface ListItemProps {
  item: ListItemDef;
  style?: CSSProperties;
}

export const ListItem = ({ item, style = {} }: ListItemProps) => (
  <div style={style}>{item.title}</div>
);
