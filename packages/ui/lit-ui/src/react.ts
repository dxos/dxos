//
// Copyright 2025 DXOS.org
//

import { type EventName, createComponent } from '@lit/react';
import React, { type ComponentPropsWithRef } from 'react';

import { DX_ANCHOR_ACTIVATE, type DxAnchorActivate } from '@dxos/react-ui-types';

import {
  type DxTagPickerItemClick,
  DxAnchor as NaturalDxAnchor,
  DxAvatar as NaturalDxAvatar,
  DxTagPickerItem as NaturalDxTagPickerItem,
  DxIcon as NaturalIcon,
} from './index';

export const DxAnchor = createComponent({
  tagName: 'dx-anchor',
  elementClass: NaturalDxAnchor,
  react: React,
  events: {
    onActivate: DX_ANCHOR_ACTIVATE as EventName<DxAnchorActivate>,
  },
});

export type DxAnchorProps = ComponentPropsWithRef<typeof DxAnchor>;

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
