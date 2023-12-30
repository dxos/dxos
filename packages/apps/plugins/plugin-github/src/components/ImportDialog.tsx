//
// Copyright 2023 DXOS.org
//

import React, { type RefObject, useCallback } from 'react';

import { log } from '@dxos/log';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';
import { type TextEditorRef } from '@dxos/react-ui-editor';

import { useOctokitContext } from './GithubApiProviders';
import { GITHUB_PLUGIN } from '../meta';
import type { GhFileIdentifier, GhIdentifier, GhIssueIdentifier } from '../types';

export const ImportDialog = ({
  docGhId,
  editorRef,
}: {
  docGhId: GhIdentifier;
  editorRef: RefObject<TextEditorRef>;
}) => {
  const { t } = useTranslation(GITHUB_PLUGIN);
  const { octokit } = useOctokitContext();

  const importGhIssueContent = useCallback(async () => {
    if (octokit && docGhId && 'issueNumber' in docGhId && editorRef.current?.view && editorRef.current?.state?.doc) {
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
  }, [octokit, docGhId, editorRef.current]);

  const importGhFileContent = useCallback(async () => {
    if (octokit && docGhId && 'path' in docGhId && editorRef.current?.view && editorRef.current?.state?.doc) {
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
  }, [octokit, docGhId, editorRef.current]);

  const handleGhImport = useCallback(() => {
    return (
      docGhId && ('issueNumber' in docGhId ? importGhIssueContent() : 'path' in docGhId ? importGhFileContent() : null)
    );
  }, [importGhIssueContent, importGhFileContent, docGhId]);

  return (
    <Dialog.Content>
      <Dialog.Title>{t('confirm import title')}</Dialog.Title>
      <p className='plb-2'>{t('confirm import body')}</p>
      <div role='none' className='flex justify-end gap-2'>
        <Dialog.Close asChild>
          <Button>{t('cancel label', { ns: 'appkit' })}</Button>
        </Dialog.Close>
        <Dialog.Close asChild>
          <Button variant='primary' onClick={handleGhImport}>
            {t('import from github label')}
          </Button>
        </Dialog.Close>
      </div>
    </Dialog.Content>
  );
};
