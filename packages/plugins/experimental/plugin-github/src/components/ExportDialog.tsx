//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { log } from '@dxos/log';
import { Button, Dialog, Input, Trans, useTranslation } from '@dxos/react-ui';

import { useOctokitContext } from './GithubApiProviders';
import { GITHUB_PLUGIN } from '../meta';
import type { ExportViewState, GhFileIdentifier, GhIdentifier } from '../types';

export const ExportDialog = ({
  type,
  target,
  docGhId,
}: {
  type: ExportViewState;
  target: string | null;
  docGhId: GhIdentifier;
}) => {
  // TODO(burdon): Model removed.
  const content = '';

  const { octokit } = useOctokitContext();
  const { t } = useTranslation(GITHUB_PLUGIN);
  const [exportViewState, setExportViewState] = useState<ExportViewState>(type);
  const [ghResponseUrl, setGhResponseUrl] = useState<string | null>(target);
  const [ghBranchValue, setGhBranchValue] = useState('');
  const [ghMessageValue, setGhMessageValue] = useState('');

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
          content: btoa(content),
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

  return (
    <Dialog.Content>
      <Dialog.Title>{t('confirm export title')}</Dialog.Title>
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
            <Dialog.Close asChild>
              <Button variant='primary' onClick={() => setExportViewState(null)}>
                {t('done label', { ns: 'os' })}
              </Button>
            </Dialog.Close>
          </div>
        </>
      ) : (
        <div role='none' className='mbs-2 space-b-2'>
          <Input.Root>
            <Input.Label>{t('github branch name label')}</Input.Label>
            <Input.TextInput
              autoFocus
              classNames='font-mono'
              disabled={exportViewState === 'pending'}
              placeholder={t('github branch name placeholder')}
              value={ghBranchValue}
              onChange={({ target: { value } }) => setGhBranchValue(value)}
            />
          </Input.Root>
          <Input.Root>
            <Input.Label>{t('github commit message label')}</Input.Label>
            <Input.TextArea
              disabled={exportViewState === 'pending'}
              placeholder={t('github commit message placeholder')}
              value={ghMessageValue}
              onChange={({ target: { value } }) => setGhMessageValue(value)}
            />
          </Input.Root>
          <div role='none' className='flex justify-end gap-2'>
            <Dialog.Close asChild>
              <Button onClick={() => setExportViewState(null)}>{t('close label', { ns: 'os' })}</Button>
            </Dialog.Close>
            <Button disabled={exportViewState === 'pending'} variant='primary' onClick={() => exportGhFileContent()}>
              {t('continue label', { ns: 'os' })}
            </Button>
          </div>
        </div>
      )}
    </Dialog.Content>
  );
};
