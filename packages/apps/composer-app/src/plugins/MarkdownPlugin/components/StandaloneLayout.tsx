//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { HTMLAttributes, PropsWithChildren, RefObject } from 'react';

import { Button, DropdownMenu, ThemeContext, Main, useThemeContext, useTranslation } from '@dxos/aurora';
import { ComposerModel, MarkdownComposerRef } from '@dxos/aurora-composer';
import { defaultBlockSeparator, getSize, mx, osTx } from '@dxos/aurora-theme';
import { Input } from '@dxos/react-appkit';
import { observer } from '@dxos/react-client';
import { Surface } from '@dxos/react-surface';

import { MarkdownProperties } from './MarkdownMain';

export const StandaloneLayout = observer(
  ({
    children,
    model,
    properties,
    editorRef,
  }: PropsWithChildren<{
    model: ComposerModel;
    properties: MarkdownProperties;
    editorRef: RefObject<MarkdownComposerRef>;
  }>) => {
    const { t } = useTranslation('composer');
    const themeContext = useThemeContext();
    return (
      <Main.Content classNames='min-bs-full'>
        <div role='none' className='mli-auto max-is-[60rem] min-bs-[100vh] bg-white dark:bg-neutral-925 flex flex-col'>
          <div role='none' className='flex items-center gap-2 pis-0 pointer-fine:pis-8 lg:pis-0 pointer-fine:lg:pis-0'>
            <Input
              key={model.id}
              variant='subdued'
              label={t('document title label')}
              labelVisuallyHidden
              placeholder={t('untitled document title')}
              value={properties.title ?? ''}
              onChange={({ target: { value } }) => (properties.title = value)}
              slots={{
                root: { className: 'shrink-0 grow pis-6 plb-1.5 pointer-fine:plb-0.5' },
                input: {
                  'data-testid': 'composer.documentTitle',
                  className: 'text-center',
                } as HTMLAttributes<HTMLInputElement>,
              }}
            />
            <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger asChild>
                  <Button classNames='p-0 is-10 shrink-0 mie-3' variant='ghost' density='coarse'>
                    <DotsThreeVertical className={getSize(6)} />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content sideOffset={10} classNames='z-10'>
                    <Surface data={[model, properties, editorRef]} role='menuitem' />
                    <DropdownMenu.Arrow />
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </ThemeContext.Provider>
          </div>
          <div role='separator' className={mx(defaultBlockSeparator, 'mli-3 opacity-50')} />
          {children}
        </div>
        {/* <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}> */}
        {/*  {handleFileImport && ( */}
        {/*    <Dialog */}
        {/*      open={fileImportDialogOpen} */}
        {/*      onOpenChange={setFileImportDialogOpen} */}
        {/*      title={t('confirm import title')} */}
        {/*      slots={{ overlay: { classNames: 'backdrop-blur-sm' } }} */}
        {/*    > */}
        {/*      <p className='mlb-4'>{t('confirm import body')}</p> */}
        {/*      <FileUploader */}
        {/*        types={['md']} */}
        {/*        classes='block mlb-4 p-8 border-2 border-dashed border-neutral-500/50 rounded flex items-center justify-center gap-2 cursor-pointer' */}
        {/*        dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }} */}
        {/*        handleChange={handleFileImport} */}
        {/*      > */}
        {/*        <FilePlus weight='duotone' className={getSize(8)} /> */}
        {/*        <span>{t('upload file message')}</span> */}
        {/*      </FileUploader> */}
        {/*      <Button classNames='block is-full' onClick={() => setFileImportDialogOpen?.(false)}> */}
        {/*        {t('cancel label', { ns: 'appkit' })} */}
        {/*      </Button> */}
        {/*    </Dialog> */}
        {/*  )} */}
        {/* </ThemeContext.Provider> */}
      </Main.Content>
    );
  },
);
