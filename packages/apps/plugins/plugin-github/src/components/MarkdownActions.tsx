//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut, FileArrowDown, FileArrowUp, Link, LinkBreak } from '@phosphor-icons/react';
import React, { type RefObject, useCallback } from 'react';

import { type MarkdownProperties } from '@braneframe/plugin-markdown';
import { LayoutAction, useIntent } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { DropdownMenu, useTranslation } from '@dxos/react-ui';
import { type ComposerModel, type MarkdownComposerRef } from '@dxos/react-ui-editor';
import { getSize } from '@dxos/react-ui-theme';

import { useOctokitContext } from './GithubApiProviders';
import { useDocGhId } from '../hooks';
import { GITHUB_PLUGIN, type GhIssueIdentifier } from '../props';

// TODO(burdon): Where do "properties" come from? Is this the graph node datum?
export const MarkdownActions = ({
  model,
  properties,
  editorRef,
}: {
  model: ComposerModel;
  properties: MarkdownProperties;
  editorRef: RefObject<MarkdownComposerRef>;
}) => {
  // TODO(burdon): Ad hoc assumption that underlying object is ECHO?
  const ghId = properties.__meta?.keys?.find((key) => key.source === 'github.com')?.id;
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
      body: model.content.toString(),
    });
  }, [octokit, docGhId, model.content]);

  const exportGhIssueContent = useCallback(async () => {
    if (octokit && docGhId && 'issueNumber' in docGhId && model.content) {
      try {
        const {
          data: { html_url: issueUrl },
        } = await updateIssueContent();
        await dispatch({
          action: LayoutAction.OPEN_DIALOG,
          data: {
            component: 'dxos.org/plugin/github/ExportDialog',
            subject: { type: 'response', target: issueUrl, model, docGhId },
          },
        });
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
      void dispatch({
        action: LayoutAction.OPEN_DIALOG,
        data: {
          component: 'dxos.org/plugin/github/ExportDialog',
          subject: { type: 'create-pr', model, docGhId },
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
              dispatch({
                action: LayoutAction.OPEN_DIALOG,
                data: { component: 'dxos.org/plugin/github/ImportDialog', subject: { docGhId, editorRef } },
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
              const index = properties.__meta?.keys?.findIndex((key) => key.source === 'github.com');
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
              action: LayoutAction.OPEN_DIALOG,
              data: { component: 'dxos.org/plugin/github/BindDialog', subject: properties },
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
