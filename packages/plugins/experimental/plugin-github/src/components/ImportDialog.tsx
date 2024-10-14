//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { log } from '@dxos/log';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';

import { useOctokitContext } from './GithubApiProviders';
import { GITHUB_PLUGIN } from '../meta';
import type { GhFileIdentifier, GhIdentifier, GhIssueIdentifier } from '../types';

export const ImportDialog = ({ docGhId, onUpdate }: { docGhId: GhIdentifier; onUpdate: (content: string) => void }) => {
  const { t } = useTranslation(GITHUB_PLUGIN);
  const { octokit } = useOctokitContext();

  const importGhIssueContent = useCallback(async () => {
    if (octokit && docGhId && 'issueNumber') {
      try {
        const { owner, repo, issueNumber } = docGhId as GhIssueIdentifier;
        const { data } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber });
        onUpdate(data.body ?? '');
      } catch (err) {
        log.error('Failed to import from Github issue', err);
      }
    } else {
      log.error('Not prepared to import from Github issue when requested.');
    }
  }, [octokit, docGhId]);

  const importGhFileContent = useCallback(async () => {
    if (octokit && docGhId && 'path' in docGhId) {
      try {
        const { owner, repo, path } = docGhId as GhFileIdentifier;
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
        if (!Array.isArray(data) && data.type === 'file') {
          onUpdate(atob(data.content));
        } else {
          log.error('Did not receive file with content from Github.');
        }
      } catch (err) {
        log.error('Failed to import from Github file', err);
      }
    } else {
      log.error('Not prepared to import from Github file when requested.');
    }
  }, [octokit, docGhId]);

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
