//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';
import './dx-avatar.pcss';

import { html } from 'lit';

import { type DxAvatarProps } from './dx-avatar';

export default {
  title: 'dx-avatar',
  parameters: { layout: 'fullscreen' },
};

export const Basic = (_props: DxAvatarProps) => {
  return html`<dx-avatar hue="teal" fallback="Composer user" icon="/icons.svg#ph--basketball--regular"></dx-avatar>`;
};
