//
// Copyright 2023 DXOS.org
//
import { DotsThreeVertical, DownloadSimple, UploadSimple } from 'phosphor-react';
import React, { useCallback } from 'react';
import { FileUploader } from 'react-drag-drop-files';
import { useOutletContext, useParams } from 'react-router-dom';
// todo(thure): `showdown` is capable of converting HTML to Markdown, but wasn’t converting the styled elements as provided by TipTap’s `getHTML`
import { Converter } from 'showdown';
import TurndownService from 'turndown';

import { Space } from '@dxos/client';
import { useFileDownload } from '@dxos/react-appkit';
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
import { Composer, useComposerEditor } from '@dxos/react-composer';

import { ComposerDocument } from '../proto';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  codeBlockStyle: 'fenced'
});

const converter = new Converter();

const nestedParagraphOutput = / +\n/g;

const PureDocumentPage = observer(({ document }: { document: ComposerDocument }) => {
  const { t } = useTranslation('composer');

  const editor = useComposerEditor({
    document: document.content,
    slots: { editor: { className: 'pbe-20' } }
  });

  const download = useFileDownload();

  const handleExport = useCallback(() => {
    const html = editor?.getHTML();
    if (html) {
      download(
        new Blob([turndownService.turndown(html).replaceAll(nestedParagraphOutput, '')], { type: 'text/plain' }),
        `${document.title}.md`
      );
    }
  }, [document, editor]);

  const handleImport = useCallback(
    async (file: File) => {
      if (editor) {
        const data = new Uint8Array(await file.arrayBuffer());
        const md = new TextDecoder('utf-8').decode(data);
        editor.commands.setContent(converter.makeHtml(md));
      }
    },
    [document, editor]
  );

  return (
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
          editor={editor}
          slots={{
            root: {
              role: 'none',
              className: 'pli-6 mbs-4'
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
            <DropdownMenuItem>
              <FileUploader
                classes='flex items-center gap-2 font-system-normal cursor-pointer'
                types={['md']}
                handleChange={handleImport}
              >
                <UploadSimple className={mx(getSize(6), 'shrink-0')} />
                <span>{t('import from markdown label')}</span>
              </FileUploader>
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </ThemeContext.Provider>
    </>
  );
});

export const DocumentPage = () => {
  const { t } = useTranslation('composer');
  const { space } = useOutletContext<{ space?: Space }>();
  const { docKey } = useParams();
  const document = space && docKey ? (space.db.getObjectById(docKey) as ComposerDocument) : undefined;

  return (
    <div role='none' className='pli-14 plb-11'>
      {document ? (
        <PureDocumentPage document={document} />
      ) : (
        <p role='alert' className='p-8 text-center'>
          {t('loading document message')}
        </p>
      )}
    </div>
  );
};
