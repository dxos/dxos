//
// Copyright 2025 DXOS.org
//

import './dx-avatar.ts';
import './dx-avatar.pcss';
import { html } from 'lit';

import { type DxAvatarProps } from './dx-avatar';

export default {
  title: 'dx-avatar',
  parameters: { layout: 'fullscreen' },
};

export const Basic = (props: DxAvatarProps) => {
  return html`<div class="dark" style="position:fixed;inset:0;">
    <dx-avatar></dx-avatar>
  </div>`;
};
