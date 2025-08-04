//
// Copyright 2025 DXOS.org
//

import { type EventName, createComponent } from '@lit/react';
import React, { type ComponentPropsWithRef } from 'react';

import {
  type DxRefTagActivate,
  type DxTagPickerItemClick,
  DxAvatar as NaturalDxAvatar,
  DxRefTag as NaturalDxRefTag,
  DxTagPickerItem as NaturalDxTagPickerItem,
  DxIcon as NaturalIcon,
} from './index';

export const DxRefTag = createComponent({
  tagName: 'dx-ref-tag',
  elementClass: NaturalDxRefTag,
  react: React,
  events: {
    onActivate: 'dx-ref-tag-activate' as EventName<DxRefTagActivate>,
  },
});

export type DxRefTagProps = ComponentPropsWithRef<typeof DxRefTag>;

export const DxAvatar = createComponent({
  tagName: 'dx-avatar',
  elementClass: NaturalDxAvatar,
  react: React,
});

export type DxAvatarProps = ComponentPropsWithRef<typeof DxAvatar>;

export const DxIcon = createComponent({
  tagName: 'dx-icon',
  elementClass: NaturalIcon,
  react: React,
});

export type DxIconProps = ComponentPropsWithRef<typeof DxIcon>;

export const DxTagPickerItem = createComponent({
  tagName: 'dx-tag-picker-item',
  elementClass: NaturalDxTagPickerItem,
  react: React,
  events: {
    onItemClick: 'dx-tag-picker-item-click' as EventName<DxTagPickerItemClick>,
  },
});

export type DxTagPickerItemProps = ComponentPropsWithRef<typeof DxTagPickerItem>;

export { createComponent };
export type { EventName };
