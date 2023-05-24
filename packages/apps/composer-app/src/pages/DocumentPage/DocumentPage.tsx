//
// Copyright 2023 DXOS.org
//

import {
  DownloadSimple,
  Eye,
  FileArrowDown,
  FileArrowUp,
  Link,
  LinkBreak,
  PencilSimpleLine,
  UploadSimple,
} from '@phosphor-icons/react';
import React, { HTMLAttributes, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
// TODO(thure): `showdown` is capable of converting HTML to Markdown, but wasn’t converting the styled elements as provided by TipTap’s `getHTML`

import { Document } from '@braneframe/types';
import { Button, useTranslation, Trans } from '@dxos/aurora';
import { Composer, MarkdownComposerRef, TextKind, TipTapEditor } from '@dxos/aurora-composer';
import { defaultFocus, getSize, mx } from '@dxos/aurora-theme';
import { Space } from '@dxos/client';
import { log } from '@dxos/log';
import { Input, Dialog, DropdownMenuItem } from '@dxos/react-appkit';
import { observer, useIdentity } from '@dxos/react-client';

import { useOctokitContext } from '../../components';
import type { OutletContext } from '../../layouts';
import { EmbeddedDocumentPage } from './EmbeddedDocumentPage';
import { GfmPreview } from './GfmPreview';
import { StandaloneDocumentPage } from './StandaloneDocumentPage';
import { useRichTextFile } from './useRichTextFile';
import { useTextFile } from './useTextFile';

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

type DocumentPageProps = {
  document: Document;
  space: Space;
};

const RichTextDocumentPage = observer(({ document, space }: DocumentPageProps) => {
  const editorRef = useRef<TipTapEditor>(null);
  const identity = useIdentity();
  const { layout } = useOutletContext<OutletContext>();

  const fileProps = useRichTextFile(editorRef);

  const Root = layout === 'embedded' ? EmbeddedDocumentPage : StandaloneDocumentPage;

  return (
    <Root
      {...{
        document,
        ...fileProps,
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
            className: 'pli-6 mbs-4',
          },
          editor: { className: 'pbe-20' },
        }}
      />
    </Root>
  );
});

type ExportViewState = 'create-pr' | 'pending' | 'response' | null;

type EditorViewState = 'editor' | 'preview';

const MarkdownDocumentPage = observer(({ document, space }: DocumentPageProps) => {
  const editorRef = useRef<MarkdownComposerRef>(null);
  const identity = useIdentity();
  const { octokit } = useOctokitContext();
  const { t } = useTranslation('composer');
  const { layout } = useOutletContext<OutletContext>();
  const [editorViewState, setEditorViewState] = useState<EditorViewState>('editor');

  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [exportViewState, setExportViewState] = useState<ExportViewState>(null);
  const [ghBindOpen, setGhBindOpen] = useState(false);
  const [ghUrlValue, setGhUrlValue] = useState('');
  const [ghBranchValue, setGhBranchValue] = useState('');
  const [ghMessageValue, setGhMessageValue] = useState('');
  const [ghResponseUrl, setGhResponseUrl] = useState<string | null>(null);

  const content = document?.content.content;

  const fileProps = useTextFile({
    editorRef,
    content,
  });

  const docGhId = useMemo<GhIdentifier | null>(() => {
    try {
      const key = document.meta?.keys?.find((key) => key.source === 'com.github');
      const [owner, repo, type, ...rest] = key?.id?.split('/') ?? [];
      if (type === 'issues') {
        return {
          owner,
          repo,
          issueNumber: parseInt(rest[0], 10),
        };
      } else if (type === 'blob') {
        const [ref, ...pathParts] = rest;
        return {
          owner,
          repo,
          ref,
          path: pathParts.join('/'),
        };
      } else {
        return null;
      }
    } catch (err) {
      log.catch(err);
      return null;
    }
  }, [document.meta?.keys]);

  const ghId = useMemo<string | null>(() => {
    try {
      const url = new URL(ghUrlValue);
      const [_, owner, repo, type, ...rest] = url.pathname.split('/');
      if (type === 'blob') {
        const [ref, ...pathParts] = rest;
        const path = pathParts.join('/');
        const ext = pathParts[pathParts.length - 1].split('.')[1];
        return ext === 'md' ? `${owner}/${repo}/blob/${ref}/${path}` : null;
      } else if (type === 'issues') {
        const [issueNumberString] = rest;
        return `${owner}/${repo}/issues/${issueNumberString}`;
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
            changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: atob(data.content) },
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
          changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: data.body ?? '' },
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
            object: { sha: baseSha },
          },
        } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${ref}` });
        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        });
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message: commitMessage,
          branch: branchName,
          sha: fileSha,
          content: btoa(content.toString()),
        });
        const {
          data: { html_url: prUrl },
        } = await octokit.rest.pulls.create({
          owner,
          repo,
          head: branchName,
          base: ref,
          title: commitMessage,
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
          data: { html_url: issueUrl },
        } = await octokit.rest.issues.update({
          owner,
          repo,
          issue_number: issueNumber,
          body: content.toString(),
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
      {octokit && (
        <DropdownMenuItem
          className='flex items-center gap-2'
          onClick={() => setEditorViewState(editorViewState === 'preview' ? 'editor' : 'preview')}
        >
          {editorViewState === 'preview' ? (
            <>
              <PencilSimpleLine className={getSize(4)} />
              <span>{t('exit gfm preview label')}</span>
            </>
          ) : (
            <>
              <Eye className={getSize(4)} />
              <span>{t('preview gfm label')}</span>
            </>
          )}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem className='flex items-center gap-2' onClick={fileProps.handleFileExport}>
        <DownloadSimple className={getSize(4)} />
        <span>{t('export to file label')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem className='flex items-center gap-2' onClick={() => fileProps.setFileImportDialogOpen(true)}>
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
                  const index = document.meta?.keys?.findIndex((key) => key.source === 'com.github');
                  index && index >= 0 && document.meta?.keys?.splice(index, 1);
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

  const Root = layout === 'embedded' ? EmbeddedDocumentPage : StandaloneDocumentPage;

  return (
    <>
      <Root
        {...{
          document,
          ...fileProps,
          dropdownMenuContent,
        }}
      >
        {editorViewState === 'preview' ? (
          <GfmPreview
            markdown={content?.toString() ?? ''}
            {...(docGhId && { owner: docGhId.owner, repo: docGhId.repo })}
          />
        ) : (
          <Composer
            ref={editorRef}
            identity={identity}
            space={space}
            text={document?.content}
            slots={{
              root: {
                role: 'none',
                className: mx(defaultFocus, 'shrink-0 grow flex flex-col'),
                'data-testid': 'composer.markdownRoot',
              } as HTMLAttributes<HTMLDivElement>,
              editor: {
                markdownTheme: {
                  '&, & .cm-scroller': {
                    display: 'flex',
                    flexDirection: 'column',
                    flex: '1 0 auto',
                    inlineSize: '100%',
                  },
                  '& .cm-content': { flex: '1 0 auto', inlineSize: '100%', paddingBlock: '1rem' },
                  '& .cm-line': { paddingInline: '1.5rem' },
                },
              },
            }}
          />
        )}
      </Root>
      <Dialog
        title={t('bind to file in github label')}
        open={ghBindOpen}
        onOpenChange={(nextOpen) => {
          if (ghId) {
            const key = { source: 'com.github', id: ghId };
            // TODO(wittjosiah): Stop overwriting document.meta.
            document.meta = { keys: [key] };
          }
          setGhBindOpen(nextOpen);
        }}
        closeTriggers={[
          <Button key='done' variant='primary'>
            {t('done label', { ns: 'os' })}
          </Button>,
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
              validationMessage: t('error github markdown path message'),
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
            classNames='bg-warning-600 dark:bg-warning-600 hover:bg-warning-700 dark:hover:bg-warning-700'
            onClick={handleGhImport}
          >
            {t('import from github label')}
          </Button>,
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
                    ),
                  },
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
  const { space, document, layout } = useOutletContext<OutletContext>();
  const embedded = layout === 'embedded';
  const [staleDialogOpen, setStaleDialogOpen] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent) {
        return;
      }

      if (event.data.type === 'comment-stale') {
        setStaleDialogOpen(true);
      }
    };

    if (embedded) {
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  }, [embedded]);

  return (
    <div role='none'>
      <Dialog
        open={staleDialogOpen}
        onOpenChange={setStaleDialogOpen}
        title={t('comment stale title')}
        closeTriggers={[
          <Button key='c1' variant='primary'>
            {t('confirm label', { ns: 'appkit' })}
          </Button>,
        ]}
      >
        <p className='plb-2'>{t('comment stale body')}</p>
      </Dialog>
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
