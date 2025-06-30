//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { addons } from 'storybook/manager-api';

import { DxThemeEditor as NaturalDxThemeEditor } from '@dxos/lit-theme-editor';
import '@dxos/lit-theme-editor/dx-theme-editor.pcss';
import { createComponent } from '@dxos/lit-ui/react';
import { type ThemeMode, ThemeProvider, Tooltip, Dialog, IconButton } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { PARAM_KEY } from '@dxos/theme-editor-addon';

/**
 * Changes theme based on storybook toolbar toggle.
 */
export const withTheme: Decorator = (Story, context) => {
  // Prevent re-rendering of the story.
  const MemoizedStory = memo(Story);
  const themeMode = context.globals.theme as ThemeMode;

  return (
    <ThemeProvider tx={defaultTx} themeMode={themeMode} resourceExtensions={context?.parameters?.translations} noCache>
      <Tooltip.Provider>
        <MemoizedStory />
        <ThemeEditor />
      </Tooltip.Provider>
    </ThemeProvider>
  );
};

const DxThemeEditor = createComponent({
  tagName: 'dx-theme-editor',
  elementClass: NaturalDxThemeEditor,
  react: React,
});

const ThemeEditor = () => {
  const [editorOpen, setEditorOpen] = useState(false);
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setEditorOpen(nextOpen);
  }, []);

  useEffect(() => {
    const openEditor = () => {
      handleOpenChange(true);
    };

    addons.getChannel().on(PARAM_KEY, openEditor);
    return () => addons.getChannel().off(PARAM_KEY, openEditor);
  }, []);

  return (
    <Dialog.Root open={editorOpen} onOpenChange={handleOpenChange} modal={false}>
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
          {editorOpen && <DxThemeEditor />}
          <Dialog.Close asChild>
            <IconButton iconOnly icon='ph--x--regular' label='Close' classNames='absolute block-start-2 inline-end-2' />
          </Dialog.Close>
        </Dialog.Content>
      </div>
    </Dialog.Root>
  );
};
