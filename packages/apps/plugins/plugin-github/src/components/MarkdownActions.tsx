//
// Copyright 2023 DXOS.org
//
import { ArrowSquareOut, FileArrowDown, FileArrowUp, Link, LinkBreak } from '@phosphor-icons/react';
import React, { RefObject, useCallback } from 'react';

import { MarkdownProperties } from '@braneframe/plugin-markdown';
import { useSplitView } from '@braneframe/plugin-splitview';
import { DropdownMenu, useTranslation } from '@dxos/aurora';
import { ComposerModel, MarkdownComposerRef } from '@dxos/aurora-composer';
import { getSize } from '@dxos/aurora-theme';
import { log } from '@dxos/log';

import { useOctokitContext } from './GithubApiProviders';
import { useDocGhId } from '../hooks';
import { GITHUB_PLUGIN, GhIssueIdentifier } from '../props';

export const MarkdownActions = ({
  data: [model, properties, editorRef],
}: {
  data: [ComposerModel, MarkdownProperties, RefObject<MarkdownComposerRef>];
}) => {
  const ghId = properties.meta?.keys?.find((key) => key.source === 'com.github')?.id;
  const { octokit } = useOctokitContext();
  const { t } = useTranslation(GITHUB_PLUGIN);
  const splitView = useSplitView();

  const docGhId = useDocGhId(properties.meta?.keys ?? []);

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
        splitView.dialogContent = ['dxos.org/plugin/github/ExportDialog', ['response', issueUrl], model, docGhId];
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
      splitView.dialogContent = ['dxos.org/plugin/github/ExportDialog', ['create-pr', null], model, docGhId];
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
              splitView.dialogContent = ['dxos.org/plugin/github/ImportDialog', docGhId, editorRef];
              splitView.dialogOpen = true;
            }}
          >
            <FileArrowDown className={getSize(4)} />
            <span className='grow'>{t('import from github label')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item classNames='gap-2' disabled={!docGhId} onClick={() => docGhId && handleGhExport()}>
            <FileArrowUp className={getSize(4)} />
            <span className='grow'>{t('export to github label')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild classNames='gap-2' disabled={!ghId}>
            <a
              {...(ghId ? { href: `https://github.com/${ghId}`, target: '_blank', rel: 'noreferrer' } : { href: '#' })}
            >
              <ArrowSquareOut className={getSize(4)} />
              <span className='grow'>{t('open in github label')}</span>
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            classNames='gap-2'
            onClick={() => {
              const index = properties.meta?.keys?.findIndex((key) => key.source === 'com.github');
              typeof index !== 'undefined' && index >= 0 && properties.meta?.keys?.splice(index, 1);
            }}
          >
            <LinkBreak className={getSize(4)} />
            <span className='grow'>{t('unbind to file in github label')}</span>
          </DropdownMenu.Item>
        </>
      ) : (
        <DropdownMenu.Item
          classNames='gap-2'
          onClick={() => {
            splitView.dialogContent = ['dxos.org/plugin/github/BindDialog', properties];
            splitView.dialogOpen = true;
          }}
        >
          <Link className={getSize(4)} />
          <span className='grow'>{t('bind to file in github label')}</span>
        </DropdownMenu.Item>
      )}
    </>
  );
};
