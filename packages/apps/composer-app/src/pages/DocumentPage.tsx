//
// Copyright 2023 DXOS.org
//

import {
  DotsThreeVertical,
  DownloadSimple,
  FileArrowDown,
  FileArrowUp,
  FilePlus,
  Link,
  LinkBreak,
  UploadSimple
} from '@phosphor-icons/react';
import React, {
  Dispatch,
  HTMLAttributes,
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

import { Button, getSize, mx, useTranslation, ThemeContext, Trans } from '@dxos/aurora';
import { Space } from '@dxos/client';
import { log } from '@dxos/log';
import { useFileDownload, DropdownMenu, Input, Dialog, DropdownMenuItem } from '@dxos/react-appkit';
import { observer, useIdentity } from '@dxos/react-client';
import { Composer, MarkdownComposerRef, TextKind, TipTapEditor } from '@dxos/react-composer';

import { useOctokitContext } from '../components';
import { ComposerDocument } from '../proto';

type GhSharedProps = {
  owner: string;
  repo: string;
};

type GhFileIdentifier = GhSharedProps & {
  ref: string;
  path: string;
};

type GhIssueIdentifier = GhSharedProps & {
  issueNumber: number;
};

type GhIdentifier = GhFileIdentifier | GhIssueIdentifier;

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  codeBlockStyle: 'fenced'
});

const converter = new Converter();

const nestedParagraphOutput = / +\n/g;

const DocumentPageContent = observer(
  ({
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
        <div role='none' className='mli-auto max-is-[50rem] min-bs-[80vh] border border-neutral-500/20 flex flex-col'>
          <Input
            key={document.id}
            variant='subdued'
            label={t('document title label')}
            labelVisuallyHidden
            placeholder={t('untitled document title')}
            value={document.title ?? ''}
            onChange={({ target: { value } }) => (document.title = value)}
            slots={{
              root: { className: 'shrink-0 pli-6 plb-1 bg-neutral-500/20' },
              input: { 'data-testid': 'composer.documentTitle' } as HTMLAttributes<HTMLInputElement>
            }}
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
  }
);

const RichTextDocumentPage = observer(({ document, space }: { document: ComposerDocument; space: Space }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const editorRef = useRef<TipTapEditor>(null);
  const identity = useIdentity();
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
      <Composer
        ref={editorRef}
        identity={identity}
        space={space}
        text={document?.content}
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

type ExportViewState = 'create-pr' | 'pending' | 'response' | null;

const MarkdownDocumentPage = observer(({ document, space }: { document: ComposerDocument; space: Space }) => {
  const editorRef = useRef<MarkdownComposerRef>(null);
  const identity = useIdentity();
  const { octokit } = useOctokitContext();
  const { t } = useTranslation('composer');

  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportViewState, setExportViewState] = useState<ExportViewState>(null);
  const [ghBindOpen, setGhBindOpen] = useState(false);
  const [ghUrlValue, setGhUrlValue] = useState('');
  const [ghBranchValue, setGhBranchValue] = useState('');
  const [ghMessageValue, setGhMessageValue] = useState('');
  const [ghResponseUrl, setGhResponseUrl] = useState<string | null>(null);

  const content = document?.content.content;

  const download = useFileDownload();

  const handleExport = useCallback(() => {
    if (content) {
      download(new Blob([content.toString()], { type: 'text/plain' }), `${document.title}.md`);
    }
  }, [document, content]);

  const handleImport = useCallback(
    async (file: File) => {
      if (content && editorRef.current?.view) {
        try {
          const data = new Uint8Array(await file.arrayBuffer());
          const md = new TextDecoder('utf-8').decode(data);
          editorRef.current.view.dispatch({
            changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: md }
          });
        } catch (error) {
          log.catch(error);
        }
        setImportDialogOpen(false);
      }
    },
    [content]
  );

  const docGhId = useMemo<GhIdentifier | null>(() => {
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

  const ghId = useMemo<GhIdentifier | null>(() => {
    try {
      const url = new URL(ghUrlValue);
      const [_, owner, repo, type, ...rest] = url.pathname.split('/');
      if (type === 'blob') {
        const [ref, ...pathParts] = rest;
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
      } else if (type === 'issues') {
        const [issueNumberString] = rest;
        return {
          owner,
          repo,
          issueNumber: parseInt(issueNumberString)
        };
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }, [ghUrlValue]);

  const importGhFileContent = useCallback(async () => {
    if (
      octokit &&
      docGhId &&
      'path' in docGhId &&
      content &&
      editorRef.current?.view &&
      editorRef.current?.state?.doc
    ) {
      try {
        const { owner, repo, path } = docGhId as GhFileIdentifier;
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
        if (!Array.isArray(data) && data.type === 'file') {
          editorRef.current.view.dispatch({
            changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: atob(data.content) }
          });
        } else {
          log.error('Did not receive file with content from Github.');
        }
      } catch (err) {
        log.error('Failed to import from Github file', err);
      }
    } else {
      log.error('Not prepared to import from Github file when requested.');
    }
  }, [octokit, docGhId, editorRef.current, content]);

  const importGhIssueContent = useCallback(async () => {
    if (
      octokit &&
      docGhId &&
      'issueNumber' in docGhId &&
      content &&
      editorRef.current?.view &&
      editorRef.current?.state?.doc
    ) {
      try {
        const { owner, repo, issueNumber } = docGhId as GhIssueIdentifier;
        const { data } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber });
        editorRef.current.view.dispatch({
          changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: data.body ?? '' }
        });
      } catch (err) {
        log.error('Failed to import from Github issue', err);
      }
    } else {
      log.error('Not prepared to import from Github issue when requested.');
    }
  }, [octokit, docGhId, editorRef.current, content]);

  const exportGhFileContent = useCallback(async () => {
    if (octokit && docGhId && 'path' in docGhId && content) {
      const branchName = ghBranchValue || t('github branch name placeholder');
      const commitMessage = ghMessageValue || t('github commit message placeholder');
      setExportViewState('pending');
      try {
        const { owner, repo, path, ref } = docGhId as GhFileIdentifier;
        const { data: fileData } = await octokit.rest.repos.getContent({ owner, repo, path });
        if (Array.isArray(fileData) || fileData.type !== 'file') {
          log.error('Attempted to export to a destination in Github that is not a file.');
          return;
        }
        const { sha: fileSha } = fileData;
        const {
          data: {
            object: { sha: baseSha }
          }
        } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${ref}` });
        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: baseSha
        });
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message: commitMessage,
          branch: branchName,
          sha: fileSha,
          content: btoa(content.toString())
        });
        const {
          data: { html_url: prUrl }
        } = await octokit.rest.pulls.create({
          owner,
          repo,
          head: branchName,
          base: ref,
          title: commitMessage
        });
        setGhResponseUrl(prUrl);
        setExportViewState('response');
      } catch (err) {
        log.error('Failed to export to Github file', err);
        setExportViewState('create-pr');
        setGhResponseUrl(null);
      }
    } else {
      log.error('Not prepared to export to Github file when requested.');
      setGhResponseUrl(null);
    }
  }, [octokit, docGhId, content, ghBranchValue, ghMessageValue, t]);

  const exportGhIssueContent = useCallback(async () => {
    if (octokit && docGhId && 'issueNumber' in docGhId && content) {
      setExportViewState(null);
      try {
        const { owner, repo, issueNumber } = docGhId as GhIssueIdentifier;
        const {
          data: { html_url: issueUrl }
        } = await octokit.rest.issues.update({
          owner,
          repo,
          issue_number: issueNumber,
          body: content.toString()
        });
        setGhResponseUrl(issueUrl);
        setExportViewState('response');
      } catch (err) {
        setExportViewState(null);
        log.error('Failed to export to Github issue');
      }
    } else {
      log.error('Not prepared to export to Github issue when requested.');
    }
  }, [octokit, docGhId, content]);

  const handleGhExport = useCallback(() => {
    return (
      docGhId &&
      ('issueNumber' in docGhId ? exportGhIssueContent() : 'path' in docGhId ? setExportViewState('create-pr') : null)
    );
  }, [exportGhIssueContent, exportGhFileContent, docGhId]);

  const handleGhImport = useCallback(() => {
    return (
      docGhId && ('issueNumber' in docGhId ? importGhIssueContent() : 'path' in docGhId ? importGhFileContent() : null)
    );
  }, [importGhIssueContent, importGhFileContent, docGhId]);

  const dropdownMenuContent = (
    <>
      <DropdownMenuItem className='flex items-center gap-2' onClick={handleExport}>
        <DownloadSimple className={getSize(4)} />
        <span>{t('export to file label')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem className='flex items-center gap-2' onClick={() => setImportDialogOpen(true)}>
        <UploadSimple className={getSize(4)} />
        <span>{t('import from file label')}</span>
      </DropdownMenuItem>
      {octokit && (
        <>
          <div role='separator' className='bs-px mli-2 mlb-1 bg-neutral-500 opacity-20' />
          {docGhId ? (
            <>
              <DropdownMenuItem
                className='flex items-center gap-2'
                onClick={() => {
                  document.github = '';
                  setGhUrlValue('');
                }}
              >
                <LinkBreak className={getSize(4)} />
                <span>{t('unbind to file in github label')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className='flex items-center gap-2' onClick={() => setImportConfirmOpen(true)}>
                <FileArrowDown className={getSize(4)} />
                <span>{t('import from github label')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className='flex items-center gap-2' onClick={handleGhExport}>
                <FileArrowUp className={getSize(4)} />
                <span>{t('export to github label')}</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem className='flex items-center gap-2' onClick={() => setGhBindOpen(true)}>
                <Link className={getSize(4)} />
                <span>{t('bind to file in github label')}</span>
              </DropdownMenuItem>
            </>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <DocumentPageContent
        {...{
          document,
          handleImport,
          importDialogOpen,
          setImportDialogOpen,
          dropdownMenuContent
        }}
      >
        <Composer
          ref={editorRef}
          identity={identity}
          space={space}
          text={document?.content}
          slots={{
            root: {
              role: 'none',
              className: 'shrink-0 grow flex flex-col',
              'data-testid': 'composer.markdownRoot'
            } as HTMLAttributes<HTMLDivElement>,
            editor: {
              markdownTheme: {
                '&, & .cm-scroller': { display: 'flex', flexDirection: 'column', flex: '1 0 auto', inlineSize: '100%' },
                '& .cm-content': { flex: '1 0 auto', inlineSize: '100%', paddingBlock: '1rem' },
                '& .cm-line': { paddingInline: '1.5rem' }
              }
            }
          }}
        />
      </DocumentPageContent>
      <Dialog
        title={t('bind to file in github label')}
        open={ghBindOpen}
        onOpenChange={(nextOpen) => {
          document.github = JSON.stringify(ghId);
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
          placeholder={t('paste url to file in github placeholder')}
          value={ghUrlValue}
          onChange={({ target: { value } }) => setGhUrlValue(value)}
          {...(ghUrlValue.length > 0 &&
            !ghId && {
              validationValence: 'error',
              validationMessage: t('error github markdown path message')
            })}
        />
      </Dialog>
      <Dialog
        title={t('confirm import title')}
        open={importConfirmOpen}
        onOpenChange={setImportConfirmOpen}
        closeTriggers={[
          <Button key='cancel'>{t('cancel label', { ns: 'appkit' })}</Button>,
          <Button
            key='done'
            variant='primary'
            className='bg-warning-600 dark:bg-warning-600 hover:bg-warning-700 dark:hover:bg-warning-700'
            onClick={handleGhImport}
          >
            {t('import from github label')}
          </Button>
        ]}
      >
        <p className='plb-2'>{t('confirm import body')}</p>
      </Dialog>
      <Dialog
        title={t('confirm export title')}
        open={!!exportViewState}
        onOpenChange={(nextOpen) => {
          setExportViewState(nextOpen ? 'create-pr' : null);
        }}
      >
        {exportViewState === 'response' ? (
          <>
            <p>
              <Trans
                {...{
                  t,
                  i18nKey: 'export to github success message',
                  values: { linkText: ghResponseUrl },
                  components: {
                    resultStyle: <span className='text-success-600 dark:text-success-300'>_</span>,
                    prLink: (
                      <a
                        href={ghResponseUrl!}
                        target='_blank'
                        rel='noreferrer'
                        className='text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-400'
                      >
                        _
                      </a>
                    )
                  }
                }}
              />
            </p>
            <div role='none' className='flex justify-end'>
              <Button variant='primary' onClick={() => setExportViewState(null)}>
                {t('done label', { ns: 'os' })}
              </Button>
            </div>
          </>
        ) : (
          <div role='none' className='mbs-2 space-b-2'>
            <Input
              disabled={exportViewState === 'pending'}
              label={t('github branch name label')}
              placeholder={t('github branch name placeholder')}
              value={ghBranchValue}
              onChange={({ target: { value } }) => setGhBranchValue(value)}
              slots={{ input: { autoFocus: true, className: 'font-mono' } }}
            />
            <Input
              disabled={exportViewState === 'pending'}
              label={t('github commit message label')}
              placeholder={t('github commit message placeholder')}
              value={ghMessageValue}
              onChange={({ target: { value } }) => setGhMessageValue(value)}
              size='textarea'
            />
            <div role='none' className='flex justify-end gap-2'>
              <Button onClick={() => setExportViewState(null)}>{t('close label', { ns: 'os' })}</Button>
              <Button disabled={exportViewState === 'pending'} variant='primary' onClick={() => exportGhFileContent()}>
                {t('continue label', { ns: 'os' })}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
});

export const DocumentPage = observer(() => {
  const { t } = useTranslation('composer');
  const { space } = useOutletContext<{ space?: Space }>();
  const { docKey } = useParams();
  const document = space && docKey ? (space.db.getObjectById(docKey) as ComposerDocument) : undefined;

  return (
    <div role='none' className='pli-14 plb-11'>
      {document && space ? (
        document.content.kind === TextKind.PLAIN ? (
          <MarkdownDocumentPage document={document} space={space} />
        ) : (
          <RichTextDocumentPage document={document} space={space} />
        )
      ) : (
        <p role='alert' className='p-8 text-center'>
          {t('loading document message')}
        </p>
      )}
    </div>
  );
});
