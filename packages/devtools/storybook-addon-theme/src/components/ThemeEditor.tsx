//
// Copyright 2025 DXOS.org
//

import React, { memo } from 'react';

import { DxThemeEditor as NaturalDxThemeEditor } from '@dxos/lit-theme-editor';
import { createComponent } from '@dxos/lit-ui/react';
import { Dialog } from '@dxos/react-ui';

// import '@dxos/lit-theme-editor/dx-theme-editor.pcss';

const DxThemeEditor = createComponent({
  tagName: 'dx-theme-editor',
  elementClass: NaturalDxThemeEditor,
  react: React,
});

export const ThemeEditor = memo(() => {
  return (
    <Dialog.Root defaultOpen modal={false}>
      <div
        role='none'
        className='dx-dialog__overlay bg-transparent pointer-events-none'
        style={{ placeContent: 'end' }}
      >
        <Dialog.Content
          classNames='relative box-content py-0 px-2 md:is-[35rem] md:max-is-none overflow-y-auto layout-contain pointer-events-auto'
          style={{ maxBlockSize: '50dvh' }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title srOnly>Theme Editor</Dialog.Title>
          <DxThemeEditor />
        </Dialog.Content>
      </div>
    </Dialog.Root>
  );
});
