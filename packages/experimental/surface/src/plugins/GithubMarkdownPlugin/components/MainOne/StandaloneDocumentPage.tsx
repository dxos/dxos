//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, FilePlus } from '@phosphor-icons/react';
import React, { Dispatch, HTMLAttributes, PropsWithChildren, ReactNode, SetStateAction } from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { Document } from '@braneframe/types';
import { Button, DropdownMenu, ThemeContext, useThemeContext, useTranslation } from '@dxos/aurora';
import { getSize, osTx } from '@dxos/aurora-theme';
import { Dialog, Input } from '@dxos/react-appkit';
import { observer } from '@dxos/react-client';

export const StandaloneDocumentPage = observer(
  ({
    children,
    document,
    dropdownMenuContent,
    handleFileImport,
    fileImportDialogOpen,
    setFileImportDialogOpen,
  }: PropsWithChildren<{
    document: Document;
    dropdownMenuContent?: ReactNode;
    handleFileImport?: (file: File) => Promise<void>;
    fileImportDialogOpen?: boolean;
    setFileImportDialogOpen?: Dispatch<SetStateAction<boolean>>;
  }>) => {
    const { t } = useTranslation('composer');
    const themeContext = useThemeContext();
    return (
      <>
        <div
          role='none'
          className='mli-auto max-is-[60rem] min-bs-[100vh] bg-white/20 dark:bg-neutral-850/20 flex flex-col'
        >
          <div
            role='none'
            className='flex items-center gap-2 bg-neutral-500/20 pis-0 pointer-fine:pis-8 lg:pis-0 pointer-fine:lg:pis-0'
          >
            <Input
              key={document.id}
              variant='subdued'
              label={t('document title label')}
              labelVisuallyHidden
              placeholder={t('untitled document title')}
              value={document.title ?? ''}
              onChange={({ target: { value } }) => (document.title = value)}
              slots={{
                root: { className: 'shrink-0 grow pis-6 plb-1' },
                input: {
                  'data-testid': 'composer.documentTitle',
                  className: 'text-center',
                } as HTMLAttributes<HTMLInputElement>,
              }}
            />
            <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button classNames='p-0 is-10 shrink-0' variant='ghost' density='coarse'>
                    <DotsThreeVertical className={getSize(6)} />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content sideOffset={10} classNames='z-10'>
                    {dropdownMenuContent}
                    <DropdownMenu.Arrow />
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </ThemeContext.Provider>
          </div>
          {children}
        </div>
        <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
          {handleFileImport && (
            <Dialog
              open={fileImportDialogOpen}
              onOpenChange={setFileImportDialogOpen}
              title={t('confirm import title')}
              slots={{ overlay: { classNames: 'backdrop-blur-sm' } }}
            >
              <p className='mlb-4'>{t('confirm import body')}</p>
              <FileUploader
                types={['md']}
                classes='block mlb-4 p-8 border-2 border-dashed border-neutral-500/50 rounded flex items-center justify-center gap-2 cursor-pointer'
                dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
                handleChange={handleFileImport}
              >
                <FilePlus weight='duotone' className={getSize(8)} />
                <span>{t('upload file message')}</span>
              </FileUploader>
              <Button classNames='block is-full' onClick={() => setFileImportDialogOpen?.(false)}>
                {t('cancel label', { ns: 'appkit' })}
              </Button>
            </Dialog>
          )}
        </ThemeContext.Provider>
      </>
    );
  },
);
