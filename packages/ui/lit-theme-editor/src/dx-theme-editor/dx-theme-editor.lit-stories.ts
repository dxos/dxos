//
// Copyright 2025 DXOS.org
//

import './dx-theme-editor.ts';
import './dx-theme-editor-physical-colors.ts';
import './dx-theme-editor-semantic-colors.ts';
import './dx-theme-editor-alias-colors.ts';
import './dx-theme-editor.pcss';
import '@dxos/lit-ui';
import { html } from 'lit';

import { type DxThemeEditorProps } from './dx-theme-editor';
import { type DxThemeEditorAliasColorsProps } from './dx-theme-editor-alias-colors';
import { type DxThemeEditorPhysicalColorsProps } from './dx-theme-editor-physical-colors';
import { type DxThemeEditorSemanticColorsProps } from './dx-theme-editor-semantic-colors';

export default {
  title: 'dx-theme-editor',
  parameters: { layout: 'fullscreen' },
};

export const CombinedThemeEditor = (props: DxThemeEditorProps) => html`<dx-theme-editor></dx-theme-editor>`;

export const PhysicalColors = (props: DxThemeEditorPhysicalColorsProps) =>
  html`<dx-theme-editor-physical-colors></dx-theme-editor-physical-colors>`;

export const SemanticColors = (props: DxThemeEditorSemanticColorsProps) =>
  html`<dx-theme-editor-semantic-colors></dx-theme-editor-semantic-colors>`;

export const AliasColors = (props: DxThemeEditorAliasColorsProps) =>
  html`<dx-theme-editor-alias-colors></dx-theme-editor-alias-colors>`;
