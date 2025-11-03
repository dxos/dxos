//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';
import './dx-avatar.pcss';

import { html } from 'lit';

import { type DxAvatarProps } from './dx-avatar';

export default {
  title: 'dx-avatar',
  parameters: {
    layout: 'centered',
  },
};

export const Basic = (_props: DxAvatarProps) =>
  html`<dx-avatar hue="teal" fallback="Composer user" icon="/icons.svg#ph--basketball--regular"></dx-avatar>`;
