//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { DxThemeEditor as NaturalDxThemeEditor } from '@dxos/lit-theme-editor';
import { createComponent } from '@dxos/lit-ui/react';

const DxThemeEditor = createComponent({
  tagName: 'dx-theme-editor',
  elementClass: NaturalDxThemeEditor,
  react: React,
});

export const Panel = () => {
  return (
    <DxThemeEditor />
  );
};
