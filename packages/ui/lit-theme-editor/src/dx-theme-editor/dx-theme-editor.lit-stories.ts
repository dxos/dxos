//
// Copyright 2025 DXOS.org
//

import './dx-theme-editor.ts';
import './dx-theme-editor.pcss';
import { html } from 'lit';

import { type DxThemeEditorProps } from './dx-theme-editor';

export default {
  title: 'dx-theme-editor',
  parameters: { layout: 'fullscreen' },
};

export const Basic = (props: DxThemeEditorProps) => {
  return html`<dx-theme-editor></dx-theme-editor>`;
};
