//
// Copyright 2023 DXOS.org
//
import { DotsThreeVertical, DownloadSimple, UploadSimple } from 'phosphor-react';
import React, { useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';

import { Space } from '@dxos/client';
import { observer } from '@dxos/react-client';
import {
  Button,
  DropdownMenu,
  getSize,
  Input,
  mx,
  useTranslation,
  ThemeContext,
  DropdownMenuItem
} from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { ComposerDocument } from '../proto';

export const DocumentPage = observer(() => {
  const { t } = useTranslation('composer');
  const { space } = useOutletContext<{ space?: Space }>();
  const { docKey } = useParams();
  const document = space && docKey ? (space.db.getObjectById(docKey) as ComposerDocument) : undefined;

  const handleExport = useCallback(() => {
    console.log(`Export ${document?.title}`);
  }, [document]);

  const handleImport = useCallback(() => {
    console.log(`Import ${document?.title}`);
  }, [document]);

  return (
    <div role='none' className='pli-14 plb-11'>
      {document ? (
        <>
          <div role='none' className='mli-auto max-is-[50rem] min-bs-screen border border-neutral-500/20'>
            <Input
              key={document.id}
              variant='subdued'
              label={t('document title label')}
              labelVisuallyHidden
              placeholder={t('untitled document title')}
              value={document.title ?? ''}
              onChange={({ target: { value } }) => (document.title = value)}
              slots={{ root: { className: 'pli-6 plb-1 mbe-3 bg-neutral-500/20' } }}
            />
            <Composer
              document={document.content}
              slots={{
                root: {
                  role: 'none',
                  className: 'pli-6 mbs-4'
                },
                editor: {
                  className: 'pbe-20'
                }
              }}
            />
          </div>
          <ThemeContext.Provider value={{ themeVariant: 'os' }}>
            <div role='none' className={mx('fixed block-start-0 inline-end-0 p-2')}>
              <DropdownMenu
                trigger={
                  <Button className='p-0 is-10' density='coarse'>
                    <DotsThreeVertical className={getSize(6)} />
                  </Button>
                }
              >
                <DropdownMenuItem onClick={handleExport} className='gap-2 font-system-normal'>
                  <DownloadSimple className={mx(getSize(6), 'shrink-0')} />
                  <span>{t('export to markdown label')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImport} className='gap-2 font-system-normal'>
                  <UploadSimple className={mx(getSize(6), 'shrink-0')} />
                  <span>{t('import from markdown label')}</span>
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </ThemeContext.Provider>
        </>
      ) : (
        <p role='alert' className='p-8 text-center'>
          {t('loading document message')}
        </p>
      )}
    </div>
  );
});
