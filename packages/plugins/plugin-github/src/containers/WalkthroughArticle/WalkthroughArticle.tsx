//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Button, Field, Panel, useThemeContext, useTranslation } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type PullRequest } from '@dxos/types';
import {
  type DiffLineTarget,
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  diffBlocks,
  walkthroughSidebar,
  walkthroughTheme,
} from '@dxos/ui-editor';

import { meta } from '#meta';
import { GitHubOperation, type Walkthrough } from '#types';

/** A definite content width, which the diff chunks cap themselves against. */
const slots: ThemeExtensionsOptions['slots'] = {
  content: { className: 'dx-container-type-inline-size w-full mx-auto! max-w-[min(72rem,100%-3rem)] py-3!' },
};

const stateHue: Record<PullRequest.State, string> = {
  open: 'green',
  closed: 'red',
  merged: 'purple',
  draft: 'neutral',
};

const ciHue: Record<GitHubOperation.CiState, string> = {
  success: 'green',
  failure: 'red',
  pending: 'amber',
  none: 'neutral',
};

type Status = { state: PullRequest.State; ci: GitHubOperation.CiState; checks: GitHubOperation.CheckCounts };

export type WalkthroughArticleProps = AppSurface.ObjectArticleProps<Walkthrough.Walkthrough>;

/**
 * A walkthrough read as a review: the pull request's number, state and CI outcome above the prose,
 * with approving and commenting one click away. Everything GitHub-side goes through the space's
 * GitHub connection.
 */
export const WalkthroughArticle = ({ role, attendableId, subject }: WalkthroughArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { themeMode } = useThemeContext();
  const { invokePromise } = useOperationInvoker();
  const [body] = useObject(subject, 'body');
  const [pullRequest] = useObject(subject.pullRequest);
  const spaceId = Obj.getDatabase(subject)?.spaceId;

  const [status, setStatus] = useState<Status>();
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [comment, setComment] = useState('');
  // Set when the composer was opened from a diff line; the comment then goes on that line.
  const [lineTarget, setLineTarget] = useState<DiffLineTarget>();

  const handleLineComment = useCallback((target: DiffLineTarget) => {
    setLineTarget(target);
    setComposing(true);
  }, []);

  const handleCloseComposer = useCallback(() => {
    setComposing(false);
    setLineTarget(undefined);
  }, []);

  // Only once the target has loaded: the handlers read the pull request's database off it.
  const pullRequestRef = pullRequest ? subject.pullRequest : undefined;

  const refreshStatus = useCallback(async () => {
    if (!pullRequestRef) {
      return;
    }
    const { data, error } = await invokePromise(
      GitHubOperation.GetPullRequestStatus,
      { pullRequest: pullRequestRef },
      { spaceId },
    );
    if (error) {
      log.warn('pull request status failed', { error });
      return;
    }
    if (data) {
      setStatus({ state: data.state, ci: data.ci, checks: data.checks });
    }
  }, [invokePromise, pullRequestRef, spaceId]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const toast = useCallback(
    (id: string, title: string, success: boolean, description?: string) =>
      invokePromise(LayoutOperation.AddToast, {
        id: `${meta.profile.key}.${id}`,
        icon: success ? 'ph--check-circle--regular' : 'ph--warning--regular',
        title: [title, { ns: meta.profile.key }],
        ...(description ? { description } : {}),
      }),
    [invokePromise],
  );

  const handleApprove = useCallback(async () => {
    if (!pullRequestRef) {
      return;
    }
    setBusy(true);
    const { error } = await invokePromise(
      GitHubOperation.SubmitPullRequestApproval,
      { pullRequest: pullRequestRef },
      { spaceId },
    );
    setBusy(false);
    if (error) {
      log.warn('approve failed', { error });
      await toast('approve', 'approve-pull-request-error.title', false, error.message);
      return;
    }
    await toast('approve', 'approve-pull-request-success.title', true);
    void refreshStatus();
  }, [invokePromise, pullRequestRef, spaceId, toast, refreshStatus]);

  const handleCopyLink = useCallback(async () => {
    if (!pullRequest?.url) {
      return;
    }
    await navigator.clipboard.writeText(pullRequest.url);
    await toast('copy-link', 'copy-link-success.title', true);
  }, [pullRequest?.url, toast]);

  const handleComment = useCallback(async () => {
    const text = comment.trim();
    if (!pullRequestRef || !text) {
      return;
    }
    setBusy(true);
    const { error } = lineTarget
      ? await invokePromise(
          GitHubOperation.AddPullRequestReviewComment,
          {
            pullRequest: pullRequestRef,
            body: text,
            commit: subject.commit,
            path: lineTarget.file,
            line: lineTarget.line,
            side: lineTarget.side === 'before' ? 'LEFT' : 'RIGHT',
          },
          { spaceId },
        )
      : await invokePromise(
          GitHubOperation.AddPullRequestComment,
          { pullRequest: pullRequestRef, body: text },
          { spaceId },
        );
    setBusy(false);
    if (error) {
      log.warn('comment failed', { error });
      await toast('comment', 'comment-error.title', false, error.message);
      return;
    }
    setComment('');
    handleCloseComposer();
    await toast('comment', 'comment-success.title', true);
  }, [comment, lineTarget, invokePromise, pullRequestRef, spaceId, subject, toast, handleCloseComposer]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'approve',
          {
            label: ['approve-pull-request.label', { ns: meta.profile.key }],
            icon: 'ph--check-circle--regular',
            variant: 'primary',
            iconOnly: false,
            disabled: busy || !pullRequestRef || status?.state === 'merged' || status?.state === 'closed',
            disposition: 'toolbar',
            testId: 'walkthrough.toolbar.approve',
          },
          () => void handleApprove(),
        )
        .action(
          'comment',
          {
            label: ['comment-pull-request.label', { ns: meta.profile.key }],
            icon: 'ph--chat-text--regular',
            disabled: busy || !pullRequestRef,
            disposition: 'toolbar',
            testId: 'walkthrough.toolbar.comment',
          },
          () => setComposing((value) => !value),
        )
        .separator()
        .action(
          'openOnGitHub',
          {
            label: ['open-on-github.label', { ns: meta.profile.key }],
            icon: 'ph--arrow-square-out--regular',
            disabled: !pullRequest?.url,
            disposition: 'toolbar',
            testId: 'walkthrough.toolbar.open-on-github',
          },
          () => pullRequest?.url && window.open(pullRequest.url, '_blank', 'noopener,noreferrer'),
        )
        .action(
          'copyLink',
          {
            label: ['copy-link.label', { ns: meta.profile.key }],
            icon: 'ph--link--regular',
            disabled: !pullRequest?.url,
            disposition: 'toolbar',
            testId: 'walkthrough.toolbar.copy-link',
          },
          () => void handleCopyLink(),
        )
        .build(),
    [busy, pullRequestRef, pullRequest?.url, status?.state, handleApprove, handleCopyLink],
  );

  const extensions = useMemo(
    () => [
      createThemeExtensions({ themeMode, slots }),
      createBasicExtensions({ lineWrapping: true, readOnly: true }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      walkthroughTheme(),
      diffBlocks({ onLineComment: handleLineComment }),
      walkthroughSidebar({}),
    ],
    [themeMode, handleLineComment],
  );
  // The body is replaced wholesale on regeneration, so the editor is rebuilt rather than patched.
  const { parentRef } = useTextEditor({ initialValue: body ?? '', extensions }, [extensions, body]);

  const state = status?.state ?? pullRequest?.state;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild classNames='dx-expand'>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Toolbar>
      <Panel.Content classNames='flex flex-col'>
        {pullRequest && (
          <div className='flex flex-wrap items-center gap-2 px-4 py-2 border-b border-separator text-sm'>
            <span className='text-description whitespace-nowrap'>
              {pullRequest.owner}/{pullRequest.repo}#{pullRequest.number}
            </span>
            {state && (
              <span className='dx-tag' data-hue={stateHue[state]}>
                {state}
              </span>
            )}
            <span className='dx-tag' data-hue={status ? ciHue[status.ci] : 'neutral'}>
              {t(status ? `ci-status.${status.ci}` : 'ci-status.unknown')}
              {status && status.checks.total > 0 && ` ${status.checks.passed}/${status.checks.total}`}
            </span>
            <span className='truncate'>{pullRequest.title}</span>
          </div>
        )}
        {composing && (
          <div className='flex flex-col gap-2 px-4 py-2 border-b border-separator'>
            {lineTarget && (
              <span className='text-sm text-description'>
                {t('comment-line.label', { file: lineTarget.file, line: lineTarget.line })}
              </span>
            )}
            <Field.Root>
              <Field.Textarea
                autoFocus
                rows={4}
                placeholder={t('comment-placeholder.label')}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </Field.Root>
            <div className='flex justify-end gap-2'>
              <Button onClick={handleCloseComposer}>{t('comment-cancel.label')}</Button>
              <Button variant='primary' disabled={busy || !comment.trim()} onClick={() => void handleComment()}>
                {t('comment-submit.label')}
              </Button>
            </div>
          </div>
        )}
        <div ref={parentRef} className='dx-fill overflow-auto' />
      </Panel.Content>
    </Panel.Root>
  );
};
