//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut, FileArrowDown, FileArrowUp, Link, LinkBreak } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { type MarkdownProperties } from '@braneframe/plugin-markdown';
import { LayoutAction, useIntent } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { getMeta } from '@dxos/react-client/echo';
import { DropdownMenu, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { useOctokitContext } from './GithubApiProviders';
import { useDocGhId } from '../hooks';
import { GITHUB_PLUGIN } from '../meta';
import { type GhIssueIdentifier } from '../types';

// TODO(burdon): Requires test; very likely out of date.
// TODO(burdon): Where do "properties" come from? Is this the graph node datum?
export const MarkdownActions = ({ content, properties }: { content: string; properties: MarkdownProperties }) => {
  // TODO(burdon): Ad hoc assumption that underlying object is ECHO?
  const ghId = getMeta(properties)?.keys?.find((key) => key.source === 'github.com')?.id;
  const { octokit } = useOctokitContext();
  const { t } = useTranslation(GITHUB_PLUGIN);
  const { dispatch } = useIntent();

  const docGhId = useDocGhId(properties.__meta?.keys ?? []);

  const updateIssueContent = useCallback(() => {
    const { owner, repo, issueNumber } = docGhId as GhIssueIdentifier;
    return octokit!.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      body: content,
    });
  }, [octokit, docGhId, content]);

  const exportGhIssueContent = useCallback(async () => {
    if (octokit && docGhId && 'issueNumber' in docGhId && content) {
      try {
        const {
          data: { html_url: issueUrl },
        } = await updateIssueContent();
        await dispatch({
          action: LayoutAction.SET_LAYOUT,
          data: {
            element: 'dialog',
            component: 'dxos.org/plugin/github/ExportDialog',
            subject: { type: 'response', target: issueUrl, docGhId, content },
          },
        });
      } catch (err) {
        log.error('Failed to export to Github issue');
      }
    } else {
      log.error('Not prepared to export to Github issue when requested.');
    }
  }, [octokit, docGhId, content]);

  const handleGhExport = useCallback(() => {
    if ('issueNumber' in docGhId!) {
      void exportGhIssueContent();
    } else if ('path' in docGhId!) {
      void dispatch({
        action: LayoutAction.SET_LAYOUT,
        data: {
          element: 'dialog',
          component: 'dxos.org/plugin/github/ExportDialog',
          subject: { type: 'create-pr', content, docGhId },
        },
      });
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
            onClick={() =>
              // TODO(burdon): Intent should return content value from dialog.
              dispatch({
                action: LayoutAction.SET_LAYOUT,
                data: { element: 'dialog', component: 'dxos.org/plugin/github/ImportDialog', subject: { docGhId } },
              })
            }
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
              const index = getMeta(properties)?.keys?.findIndex((key) => key.source === 'github.com');
              typeof index !== 'undefined' && index >= 0 && properties.__meta?.keys?.splice(index, 1);
            }}
          >
            <LinkBreak className={getSize(4)} />
            <span className='grow'>{t('unbind to file in github label')}</span>
          </DropdownMenu.Item>
        </>
      ) : (
        <DropdownMenu.Item
          classNames='gap-2'
          onClick={() =>
            dispatch({
              action: LayoutAction.SET_LAYOUT,
              data: { element: 'dialog', component: 'dxos.org/plugin/github/BindDialog', subject: properties },
            })
          }
        >
          <Link className={getSize(4)} />
          <span className='grow'>{t('bind to file in github label')}</span>
        </DropdownMenu.Item>
      )}
    </>
  );
};
