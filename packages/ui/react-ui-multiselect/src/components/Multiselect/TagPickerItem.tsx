//
// Copyright 2025 DXOS.org
//

import React, { type ComponentPropsWithRef } from 'react';

import { createComponent, type EventName, DxTagPickerItem, type DxTagPickerItemClick } from '@dxos/lit-ui';

export const TagPickerItem = createComponent({
  tagName: 'dx-tag-picker-item',
  elementClass: DxTagPickerItem,
  react: React,
  events: {
    onItemClick: 'dx-tag-picker-item-click' as EventName<DxTagPickerItemClick>,
  },
});

export type TagPickerItemProps = ComponentPropsWithRef<typeof TagPickerItem>;
