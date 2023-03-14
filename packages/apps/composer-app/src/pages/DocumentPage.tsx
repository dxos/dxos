//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, DownloadSimple, FilePlus, UploadSimple } from '@phosphor-icons/react';
import React, { Dispatch, PropsWithChildren, SetStateAction, useCallback, useRef, useState } from 'react';
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
  DropdownMenuItem,
  Dialog
} from '@dxos/react-components';
import { MarkdownComposer, RichTextComposer, TipTapEditor, MarkdownComposerRef } from '@dxos/react-composer';

import { useOctokitContext } from '../components/OctokitProvider';
import { ComposerDocument } from '../proto';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  codeBlockStyle: 'fenced'
});

const converter = new Converter();

const nestedParagraphOutput = / +\n/g;

const DocumentPageContent = ({
  children,
  document,
  handleExport,
  handleImport,
  handleExportToGithub,
  handleImportFromGithub,
  dialogOpen,
  setDialogOpen
}: PropsWithChildren<{
  document: ComposerDocument;
  handleExport?: () => void;
  handleImport?: (file: File) => Promise<void>;
  handleExportToGithub?: () => Promise<void>;
  handleImportFromGithub?: () => Promise<void>;
  dialogOpen: boolean;
  setDialogOpen: Dispatch<SetStateAction<boolean>>;
}>) => {
  const { t } = useTranslation('composer');
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
        {children}
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
            {handleExport && (
              <DropdownMenuItem onClick={handleExport} className='gap-2 font-system-normal'>
                <DownloadSimple className={mx(getSize(6), 'shrink-0')} />
                <span>{t('export to markdown label')}</span>
              </DropdownMenuItem>
            )}
            {handleImport && (
              <DropdownMenuItem className='gap-2 font-system-normal' onClick={() => setDialogOpen(true)}>
                <UploadSimple className={mx(getSize(6), 'shrink-0')} />
                <span>{t('import from markdown label')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className='gap-2 font-system-normal'
              onClick={handleExportToGithub}
              disabled={!handleExportToGithub}
            >
              <DownloadSimple className={mx(getSize(6), 'shrink-0')} />
              <span>{t('export to github label')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className='gap-2 font-system-normal'
              onClick={handleImportFromGithub}
              disabled={!handleImportFromGithub}
            >
              <UploadSimple className={mx(getSize(6), 'shrink-0')} />
              <span>{t('import from github label')}</span>
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={t('confirm import title')}
          slots={{ overlay: { className: 'backdrop-blur-sm' } }}
        >
          <p className='mlb-4'>{t('confirm import body')}</p>
          <FileUploader
            types={['md']}
            classes='block mlb-4 p-8 border-2 border-dashed border-neutral-500/50 rounded flex items-center justify-center gap-2 cursor-pointer'
            dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
            handleChange={handleImport}
          >
            <FilePlus weight='duotone' className={getSize(8)} />
            <span>{t('upload file message')}</span>
          </FileUploader>
          <Button className='block is-full' onClick={() => setDialogOpen(false)}>
            {t('cancel label', { ns: 'appkit' })}
          </Button>
        </Dialog>
      </ThemeContext.Provider>
    </>
  );
};

const PureRichTextDocumentPage = observer(({ document }: { document: ComposerDocument }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const editorRef = useRef<TipTapEditor>(null);

  const download = useFileDownload();

  const handleExport = useCallback(() => {
    const editor = editorRef.current;
    const html = editor?.getHTML();
    if (html) {
      download(
        new Blob([turndownService.turndown(html).replaceAll(nestedParagraphOutput, '')], { type: 'text/plain' }),
        `${document.title}.md`
      );
    }
  }, [document]);

  const handleImport = useCallback(
    async (file: File) => {
      const editor = editorRef.current;
      if (editor) {
        const data = new Uint8Array(await file.arrayBuffer());
        const md = new TextDecoder('utf-8').decode(data);
        editor.commands.setContent(converter.makeHtml(md));
        setDialogOpen(false);
      }
    },
    [document]
  );

  return (
    <DocumentPageContent {...{ document, handleExport, handleImport, dialogOpen, setDialogOpen }}>
      <RichTextComposer
        ref={editorRef}
        text={document.content}
        slots={{
          root: {
            role: 'none',
            className: 'pli-6 mbs-4'
          },
          editor: { className: 'pbe-20' }
        }}
      />
    </DocumentPageContent>
  );
});

const PureMarkdownDocumentPage = observer(({ document }: { document: ComposerDocument }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const editorRef = useRef<MarkdownComposerRef>(null);
  const { octokit } = useOctokitContext();

  const _download = useFileDownload();

  const handleExportToGithub = useCallback(async () => {
    // todo
  }, [document, octokit]);

  const handleImportFromGithub = useCallback(async () => {
    // todo
  }, [document, octokit]);

  return (
    <DocumentPageContent
      {...{ document, dialogOpen, setDialogOpen, ...(octokit && { handleExportToGithub, handleImportFromGithub }) }}
    >
      <MarkdownComposer
        ref={editorRef}
        text={document.content}
        slots={{
          root: {
            role: 'none',
            className: 'pli-6 mbs-4'
          },
          editor: { className: 'pbe-20' }
        }}
      />
    </DocumentPageContent>
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
        document.textintention === 'markdown' ? (
          <PureMarkdownDocumentPage document={document} />
        ) : (
          <PureRichTextDocumentPage document={document} />
        )
      ) : (
        <p role='alert' className='p-8 text-center'>
          {t('loading document message')}
        </p>
      )}
    </div>
  );
};
