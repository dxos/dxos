//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Button, Panel, Toolbar, useThemeContext, useTranslation } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { PullRequest } from '@dxos/types';
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
import { GitHubOperation, Walkthrough } from '#types';

import { CommentComposer, LineCommentPopover } from '../../components/index.ts';
import { newestWalkthrough } from '../../walkthrough/index.ts';
import { pullRequestFailureKey } from './failure.ts';

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

export type PullRequestArticleProps = AppSurface.ObjectArticleProps<PullRequest.PullRequest>;

/**
 * A pull request read as a review: its number, state and CI outcome above whatever narration the
 * space holds, with approving and commenting one click away. Everything GitHub-side goes through
 * the space's GitHub connection.
 *
 * The pull request is the subject rather than the walkthrough because one exists before the other
 * does: a pull request just imported has no narration yet, and generating it is an action ON the
 * pull request, not a different object to open.
 */
export const PullRequestArticle = ({ role, attendableId, subject: pullRequest }: PullRequestArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { themeMode } = useThemeContext();
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(pullRequest);
  const spaceId = db?.spaceId;

  const walkthroughs = useQuery(db, Filter.type(Walkthrough.Walkthrough, { pullRequest: Ref.make(pullRequest) }));
  const walkthrough = useMemo(() => newestWalkthrough(walkthroughs), [walkthroughs]);
  const body = walkthrough?.body;

  const [status, setStatus] = useState<Status>();
  // The live state where it has arrived, the stored one until then — an absent status is unknown,
  // not "open", and GitHub accepts an approval on a merged pull request rather than rejecting it.
  const state = status?.state ?? pullRequest.state;
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [composing, setComposing] = useState(false);
  const [comment, setComment] = useState('');
  // Set when the composer was opened from a diff line; the comment then goes on that line.
  const [lineTarget, setLineTarget] = useState<{ target: DiffLineTarget; commit: string }>();
  // The diff line's own button, which the composer is positioned at: the anchor is a DOM node
  // CodeMirror owns, so it is held in a ref rather than state and never re-renders the article.
  const lineAnchorRef = useRef<HTMLElement | null>(null);

  const handleLineComment = useCallback(
    (target: DiffLineTarget, anchor: HTMLElement) => {
      if (!walkthrough) {
        return;
      }
      lineAnchorRef.current = anchor;
      // The commit travels with the target: a regeneration between opening the composer and posting
      // would otherwise pair the NEW commit with line numbers read from the old diff, which GitHub
      // either rejects or anchors to the wrong line.
      setLineTarget({ target, commit: walkthrough.commit });
      setComposing(true);
    },
    [walkthrough],
  );

  /** The toolbar's composer is about the pull request, so it drops whatever line was targeted. */
  const handleToggleComposer = useCallback(() => {
    setLineTarget(undefined);
    lineAnchorRef.current = null;
    setComposing((value) => value === false || lineTarget !== undefined);
  }, [lineTarget]);

  const handleCloseComposer = useCallback(() => {
    setComposing(false);
    setLineTarget(undefined);
    lineAnchorRef.current = null;
  }, []);

  const pullRequestRef = useMemo(() => Ref.make(pullRequest), [pullRequest]);

  const refreshStatus = useCallback(async () => {
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
    setBusy(true);
    const { data, error } = await invokePromise(
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
    await toast(
      'approve',
      data?.commented ? 'approve-pull-request-commented.title' : 'approve-pull-request-success.title',
      true,
    );
    void refreshStatus();
  }, [invokePromise, pullRequestRef, spaceId, toast, refreshStatus]);

  /** `force` is what makes the toolbar's entry a REgeneration: the same head would otherwise no-op. */
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const { error } = await invokePromise(
      GitHubOperation.GenerateWalkthrough,
      { pullRequest: pullRequestRef, force: walkthrough !== undefined },
      { spaceId },
    );

    setGenerating(false);
    if (error) {
      log.warn('walkthrough generation failed', { error });
      // A rejected credential is the one failure the user can act on, and `error.message` states it
      // only as a bare `401` inside an HTTP error string.
      const failureKey = pullRequestFailureKey(error, 'walkthrough-failed.title');
      await toast(
        'walkthrough',
        failureKey,
        false,
        failureKey === 'walkthrough-failed.title' ? error.message : undefined,
      );
      return;
    }
    await toast('walkthrough', 'walkthrough-ready.title', true);
  }, [invokePromise, pullRequestRef, spaceId, walkthrough, toast]);

  const handleCopyLink = useCallback(async () => {
    if (!pullRequest.url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pullRequest.url);
    } catch (error) {
      // Denied permission, or a document that is not focused; either way the link is not on the
      // clipboard and the success toast would be a lie.
      log.warn('copy link failed', { error });
      await toast('copy-link', 'copy-link-error.title', false);
      return;
    }
    await toast('copy-link', 'copy-link-success.title', true);
  }, [pullRequest.url, toast]);

  const handleComment = useCallback(async () => {
    const text = comment.trim();
    if (!text) {
      return;
    }
    setBusy(true);
    const { error } = lineTarget
      ? await invokePromise(
          GitHubOperation.AddPullRequestReviewComment,
          {
            pullRequest: pullRequestRef,
            body: text,
            commit: lineTarget.commit,
            path: lineTarget.target.file,
            line: lineTarget.target.line,
            side: lineTarget.target.side === 'before' ? ('LEFT' as const) : ('RIGHT' as const),
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
  }, [comment, lineTarget, invokePromise, pullRequestRef, spaceId, toast, handleCloseComposer]);

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
            disabled: busy || state === 'merged' || state === 'closed',
            disposition: 'toolbar',
            testId: 'pull-request.toolbar.approve',
          },
          () => void handleApprove(),
        )
        .action(
          'comment',
          {
            label: ['comment-pull-request.label', { ns: meta.profile.key }],
            icon: 'ph--chat-text--regular',
            disabled: busy,
            disposition: 'toolbar',
            testId: 'pull-request.toolbar.comment',
          },
          () => handleToggleComposer(),
        )
        .separator()
        .action(
          'generateWalkthrough',
          {
            label: [
              walkthrough ? 'regenerate-walkthrough.label' : 'generate-walkthrough.label',
              { ns: meta.profile.key },
            ],
            icon: 'ph--path--regular',
            disabled: generating,
            disposition: 'toolbar',
            testId: 'pull-request.toolbar.generate-walkthrough',
          },
          () => void handleGenerate(),
        )
        .action(
          'openOnGitHub',
          {
            label: ['open-on-github.label', { ns: meta.profile.key }],
            icon: 'ph--arrow-square-out--regular',
            disabled: !pullRequest.url,
            disposition: 'toolbar',
            testId: 'pull-request.toolbar.open-on-github',
          },
          () => pullRequest.url && window.open(pullRequest.url, '_blank', 'noopener,noreferrer'),
        )
        .action(
          'copyLink',
          {
            label: ['copy-link.label', { ns: meta.profile.key }],
            icon: 'ph--link--regular',
            disabled: !pullRequest.url,
            disposition: 'toolbar',
            testId: 'pull-request.toolbar.copy-link',
          },
          () => void handleCopyLink(),
        )
        .build(),
    [
      busy,
      generating,
      walkthrough,
      pullRequest.url,
      state,
      handleApprove,
      handleGenerate,
      handleCopyLink,
      handleToggleComposer,
    ],
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

  const composerProps = {
    value: comment,
    busy,
    onValueChange: setComment,
    onSubmit: () => void handleComment(),
    onCancel: handleCloseComposer,
  };

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild classNames='dx-expand'>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Toolbar>
      <Panel.Content classNames='flex flex-col'>
        <Toolbar.Root>
          <span className='dx-tag'>
            {pullRequest.owner}/{pullRequest.repo}#{pullRequest.number}
          </span>
          <span className='truncate'>{pullRequest.title}</span>
          <Toolbar.Separator />
          {state && (
            <span className='dx-tag' data-hue={stateHue[state]}>
              {state}
            </span>
          )}
          <span className='dx-tag' data-hue={status ? ciHue[status.ci] : 'neutral'}>
            {t(status ? `ci-status.${status.ci}.label` : 'ci-status.unknown.label')}
            {status && status.checks.total > 0 && ` ${status.checks.passed}/${status.checks.total}`}
          </span>
        </Toolbar.Root>

        {composing && !lineTarget && (
          <div className='flex flex-col gap-2 p-3 border-b border-separator'>
            <CommentComposer {...composerProps} />
          </div>
        )}

        <LineCommentPopover
          {...composerProps}
          open={composing && !!lineTarget}
          anchorRef={lineAnchorRef}
          target={lineTarget?.target}
        />
        {walkthrough ? (
          <div ref={parentRef} className='dx-fill overflow-auto' />
        ) : (
          <div className='flex flex-col items-center justify-center gap-2 dx-fill text-description'>
            <p>{t(generating ? 'walkthrough-generating.message' : 'no-walkthrough.message')}</p>
            {!generating && (
              <Button variant='primary' onClick={() => void handleGenerate()}>
                {t('generate-walkthrough.label')}
              </Button>
            )}
          </div>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
