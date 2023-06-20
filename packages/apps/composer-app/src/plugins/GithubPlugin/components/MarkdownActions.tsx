//
// Copyright 2023 DXOS.org
//
import { ArrowSquareOut, FileArrowDown, FileArrowUp, Link, LinkBreak } from '@phosphor-icons/react';
import React, { RefObject, useCallback } from 'react';

import { DropdownMenu, useTranslation } from '@dxos/aurora';
import { ComposerModel, MarkdownComposerRef } from '@dxos/aurora-composer';
import { getSize } from '@dxos/aurora-theme';
import { log } from '@dxos/log';
import { useSplitViewContext } from '@dxos/react-surface';

import { MarkdownProperties } from '../../MarkdownPlugin/components';
import { useDocGhId } from '../hooks';
import { GhIssueIdentifier } from '../props';
import { useOctokitContext } from './GithubApiProviders';

export const MarkdownActions = ({ data }: { data: any }) => {
  const [model, properties, editorRef]: [ComposerModel, MarkdownProperties, RefObject<MarkdownComposerRef>] = data;
  const ghId = properties.keys?.find((key) => key.source === 'com.github')?.id;
  const { octokit } = useOctokitContext();
  const { t } = useTranslation('plugin-github');
  const splitView = useSplitViewContext();

  const docGhId = useDocGhId(properties.keys ?? []);

  const updateIssueContent = useCallback(() => {
    const { owner, repo, issueNumber } = docGhId as GhIssueIdentifier;
    return octokit!.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      body: model.content.toString(),
    });
  }, [octokit, docGhId, model.content]);

  const exportGhIssueContent = useCallback(async () => {
    if (octokit && docGhId && 'issueNumber' in docGhId && model.content) {
      try {
        const {
          data: { html_url: issueUrl },
        } = await updateIssueContent();
        splitView.dialogContent = ['dxos:githubPlugin/ExportDialog', ['response', issueUrl], model, docGhId];
        splitView.dialogOpen = true;
      } catch (err) {
        log.error('Failed to export to Github issue');
      }
    } else {
      log.error('Not prepared to export to Github issue when requested.');
    }
  }, [octokit, docGhId, model.content]);

  const handleGhExport = useCallback(() => {
    if ('issueNumber' in docGhId!) {
      void exportGhIssueContent();
    } else if ('path' in docGhId!) {
      splitView.dialogContent = ['dxos:githubPlugin/ExportDialog', ['create-pr', null], model, docGhId];
      splitView.dialogOpen = true;
    }
  }, [exportGhIssueContent, docGhId]);

  return (
    <>
      <DropdownMenu.GroupLabel>{t('markdown actions label')}</DropdownMenu.GroupLabel>
      {docGhId ? (
        <>
          <DropdownMenu.Item
            classNames='gap-2'
            disabled={!docGhId}
            onClick={() => {
              splitView.dialogContent = ['dxos:githubPlugin/ImportDialog', docGhId, editorRef];
              splitView.dialogOpen = true;
            }}
          >
            <span className='grow'>{t('import from github label')}</span>
            <FileArrowDown className={getSize(4)} />
          </DropdownMenu.Item>
          <DropdownMenu.Item classNames='gap-2' disabled={!docGhId} onClick={() => docGhId && handleGhExport()}>
            <span className='grow'>{t('export to github label')}</span>
            <FileArrowUp className={getSize(4)} />
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild classNames='gap-2' disabled={!ghId}>
            <a
              {...(ghId ? { href: `https://github.com/${ghId}`, target: '_blank', rel: 'noreferrer' } : { href: '#' })}
            >
              <span className='grow'>{t('open in github label')}</span>
              <ArrowSquareOut className={getSize(4)} />
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            classNames='gap-2'
            onClick={() => {
              const index = properties.keys?.findIndex((key) => key.source === 'com.github');
              index && index >= 0 && properties.keys?.splice(index, 1);
            }}
          >
            <span className='grow'>{t('unbind to file in github label')}</span>
            <LinkBreak className={getSize(4)} />
          </DropdownMenu.Item>
        </>
      ) : (
        <DropdownMenu.Item
          classNames='gap-2'
          onClick={() => {
            splitView.dialogContent = ['dxos:githubPlugin/BindDialog', properties];
            splitView.dialogOpen = true;
          }}
        >
          <span className='grow'>{t('bind to file in github label')}</span>
          <Link className={getSize(4)} />
        </DropdownMenu.Item>
      )}
    </>
  );
};
