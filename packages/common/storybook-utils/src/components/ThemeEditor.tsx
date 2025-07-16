//
// Copyright 2025 DXOS.org
//

import React, { memo } from 'react';

import { DxThemeEditor as NaturalDxThemeEditor } from '@dxos/lit-theme-editor';
import { createComponent } from '@dxos/lit-ui/react';

import '@dxos/lit-theme-editor/dx-theme-editor.pcss';

const DxThemeEditor = createComponent({
  tagName: 'dx-theme-editor',
  elementClass: NaturalDxThemeEditor,
  react: React,
});

export const ThemeEditor = memo(DxThemeEditor);
