//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, FilePlus, GithubLogo } from '@phosphor-icons/react';
import React, {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState
} from 'react';
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
  Dialog,
  DropdownMenuItem
} from '@dxos/react-components';
import { MarkdownComposer, RichTextComposer, TipTapEditor, MarkdownComposerRef } from '@dxos/react-composer';

import { useOctokitContext } from '../components/OctokitProvider';
import { ComposerDocument } from '../proto';

type GhFileIdentifier = {
  owner: string;
  repo: string;
  ref?: string;
  path: string;
};

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
  dropdownMenuContent,
  handleImport,
  importDialogOpen,
  setImportDialogOpen
}: PropsWithChildren<{
  document: ComposerDocument;
  dropdownMenuContent?: ReactNode;
  handleImport?: (file: File) => Promise<void>;
  importDialogOpen?: boolean;
  setImportDialogOpen?: Dispatch<SetStateAction<boolean>>;
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
            {dropdownMenuContent}
          </DropdownMenu>
        </div>
        {handleImport && (
          <Dialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
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
            <Button className='block is-full' onClick={() => setImportDialogOpen?.(false)}>
              {t('cancel label', { ns: 'appkit' })}
            </Button>
          </Dialog>
        )}
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
  const editorRef = useRef<MarkdownComposerRef>(null);
  const { octokit } = useOctokitContext();
  const { t } = useTranslation('composer');

  const [ghBindOpen, setGhBindOpen] = useState(false);
  const [ghFileValue, setGhFileValue] = useState('');

  const docGhFileId = useMemo<GhFileIdentifier | null>(() => {
    try {
      const extantFileId = JSON.parse(document.github);
      if (extantFileId) {
        return extantFileId;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }, [document.github]);

  const ghFileId = useMemo<GhFileIdentifier | null>(() => {
    try {
      const url = new URL(ghFileValue);
      const [_, owner, repo, _blob, ref, ...pathParts] = url.pathname.split('/');
      const path = pathParts.join('/');
      const ext = pathParts[pathParts.length - 1].split('.')[1];

      return ext === 'md'
        ? {
            owner,
            repo,
            ref,
            path
          }
        : null;
    } catch (e) {
      return null;
    }
  }, [ghFileValue]);

  console.log('[file id]', docGhFileId, ghFileId);

  const dropdownMenuContent = (
    <>
      <DropdownMenuItem className='flex items-center gap-2' onClick={() => setGhBindOpen(true)}>
        <GithubLogo className={getSize(4)} />
        <span>{t('bind to file in github label')}</span>
      </DropdownMenuItem>
    </>
  );

  return (
    <>
      <DocumentPageContent
        {...{
          document,
          ...(octokit && { dropdownMenuContent })
        }}
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
      <Dialog
        title={t('bind to file in github label')}
        open={ghBindOpen}
        onOpenChange={(nextOpen) => {
          document.github = JSON.stringify(ghFileId);
          setGhBindOpen(nextOpen);
        }}
        closeTriggers={[
          <Button key='done' variant='primary'>
            {t('done label', { ns: 'os' })}
          </Button>
        ]}
      >
        <Input
          label={t('paste url to file in github label')}
          description={t('paste url to file in github description')}
          value={ghFileValue}
          onChange={({ target: { value } }) => setGhFileValue(value)}
          {...(ghFileValue.length > 0 &&
            !ghFileId && {
              validationValence: 'error',
              validationMessage: t('error github markdown path message')
            })}
        />
      </Dialog>
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
