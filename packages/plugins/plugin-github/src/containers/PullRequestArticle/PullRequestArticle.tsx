//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import * as Binding from '@dxos/plugin-connector/Binding';
import { Flex, Panel, Tabs, useTranslation } from '@dxos/react-ui';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { PullRequest } from '@dxos/types';
import { type DiffLineTarget } from '@dxos/ui-editor';

import { meta } from '#meta';
import { GitHubOperation, Walkthrough } from '#types';

import {
  CommentBand,
  LineCommentPopover,
  type PullRequestDetailsValues,
  PullRequestFiles,
  PullRequestOverview,
  WalkthroughPlaceholder,
  WalkthroughView,
} from '../../components/index.ts';
import { usePullRequestDiff, usePullRequestFiles } from '../../hooks/index.ts';
import { githubConnection } from '../../operations/pull-request.ts';
import { newestWalkthrough } from '../../walkthrough/index.ts';
import { pullRequestFailureKey } from './failure.ts';

const ciLabel: Record<GitHubOperation.CiState, string> = {
  success: 'ci-status.success.label',
  failure: 'ci-status.failure.label',
  pending: 'ci-status.pending.label',
  none: 'ci-status.none.label',
};

type Status = {
  state: PullRequest.State;
  body?: string;
  ci: GitHubOperation.CiState;
  checks: GitHubOperation.CheckCounts;
  runs: readonly GitHubOperation.CheckRun[];
};

type Tab = 'overview' | 'walkthrough' | 'files';

const TABS: readonly Tab[] = ['overview', 'walkthrough', 'files'];

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
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(pullRequest);
  const spaceId = db?.spaceId;

  const walkthroughs = useQuery(db, Filter.type(Walkthrough.Walkthrough, { pullRequest: Ref.make(pullRequest) }));
  const walkthrough = useMemo(() => newestWalkthrough(walkthroughs), [walkthroughs]);

  const [status, setStatus] = useState<Status>();
  // The live state where it has arrived, the stored one until then — an absent status is unknown,
  // not "open", and GitHub accepts an approval on a merged pull request rather than rejecting it.
  const state = status?.state ?? pullRequest.state;
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [composing, setComposing] = useState(false);
  const [comment, setComment] = useState('');
  // Set when the composer was opened from a diff line; the comment then goes on that line.
  const [lineTarget, setLineTarget] = useState<{ target: DiffLineTarget; commit: string }>();
  // The diff line's own button, which the composer is positioned at: the anchor is a DOM node
  // CodeMirror owns, so it is held in a ref rather than state and never re-renders the article.
  const lineAnchorRef = useRef<HTMLElement | null>(null);

  const openLineComment = useCallback((target: DiffLineTarget, anchor: HTMLElement, commit: string) => {
    lineAnchorRef.current = anchor;
    // The commit travels with the target: a regeneration or push between opening the composer and
    // posting would otherwise pair the NEW commit with line numbers read from the old diff, which
    // GitHub either rejects or anchors to the wrong line.
    setLineTarget({ target, commit });
    setComposing(true);
  }, []);

  const handleWalkthroughLineComment = useCallback(
    (target: DiffLineTarget, anchor: HTMLElement) => walkthrough && openLineComment(target, anchor, walkthrough.commit),
    [walkthrough, openLineComment],
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
  const reference = PullRequest.reference(pullRequest);

  // The diff is only read once the files tab is first opened: most visits never look at it.
  const diff = usePullRequestDiff(pullRequestRef, spaceId, tab === 'files');
  const files = usePullRequestFiles(diff.diff, `${meta.profile.key}.reviewed.${reference}`);
  const { file, step, setReviewed } = files;

  const handleFilesLineComment = useCallback(
    (target: DiffLineTarget, anchor: HTMLElement) => diff.commit && openLineComment(target, anchor, diff.commit),
    [diff.commit, openLineComment],
  );

  /** Checking a file off moves on to the next one, the way a reader works down the list. */
  const handleToggleReviewed = useCallback(() => {
    if (!file) {
      return;
    }
    const reviewed = !files.reviewed.has(file.path);
    setReviewed(file.path, reviewed);
    if (reviewed) {
      step(1);
    }
  }, [file, files.reviewed, setReviewed, step]);

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
      setStatus({ state: data.state, body: data.body, ci: data.ci, checks: data.checks, runs: data.runs });
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

  /**
   * A rejected credential is the one failure the user can fix, so it names the fix and links to the
   * connection; any other failure shows the raw error under the action's own title.
   */
  const failureToast = useCallback(
    async (id: string, fallbackKey: string, error: Error) => {
      const key = pullRequestFailureKey(error, fallbackKey);
      if (key === fallbackKey || !db) {
        return toast(id, key, false, error.message);
      }

      const connection = (
        await EffectEx.runPromise(
          githubConnection().pipe(
            Effect.provide(Database.layer(db)),
            Effect.orElseSucceed(() => undefined),
          ),
        )
      )?.connection;
      return invokePromise(LayoutOperation.AddToast, {
        id: `${meta.profile.key}.${id}`,
        icon: 'ph--warning--regular',
        title: [key, { ns: meta.profile.key }],
        ...(connection
          ? {
              actionLabel: ['open-github-connection.label', { ns: meta.profile.key }],
              actionAlt: ['open-github-connection.label', { ns: meta.profile.key }],
              onAction: () =>
                void invokePromise(LayoutOperation.Open, {
                  subject: [Binding.connectionSubject(db.spaceId, connection.id)],
                  navigation: 'immediate',
                }),
            }
          : {}),
      });
    },
    [db, invokePromise, toast],
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
      await failureToast('approve', 'approve-pull-request-error.title', error);
      return;
    }
    await toast(
      'approve',
      data?.commented ? 'approve-pull-request-commented.title' : 'approve-pull-request-success.title',
      true,
    );
    void refreshStatus();
  }, [invokePromise, pullRequestRef, spaceId, toast, failureToast, refreshStatus]);

  /** `force` is what makes the toolbar's entry a REgeneration: the same head would otherwise no-op. */
  const handleGenerate = useCallback(async () => {
    setTab('walkthrough');
    setGenerating(true);
    const { error } = await invokePromise(
      GitHubOperation.GenerateWalkthrough,
      { pullRequest: pullRequestRef, force: walkthrough !== undefined },
      { spaceId },
    );

    setGenerating(false);
    if (error) {
      log.warn('walkthrough generation failed', { error });
      await failureToast('walkthrough', 'walkthrough-failed.title', error);
      return;
    }
    await toast('walkthrough', 'walkthrough-ready.title', true);
  }, [invokePromise, pullRequestRef, spaceId, walkthrough, toast, failureToast]);

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
      await failureToast('comment', 'comment-error.title', error);
      return;
    }
    setComment('');
    handleCloseComposer();
    await toast('comment', 'comment-success.title', true);
  }, [comment, lineTarget, invokePromise, pullRequestRef, spaceId, toast, failureToast, handleCloseComposer]);

  // The tablist only needs the `Tabs.Root` context, which wraps the whole panel.
  const tabs = useMemo(
    () => (
      <Tabs.Tablist>
        {TABS.map((value) => (
          <Tabs.Button key={value} value={value} data-testid={`pull-request.tab.${value}`}>
            {t(`${value}-tab.label`)}
          </Tabs.Button>
        ))}
      </Tabs.Tablist>
    ),
    [t],
  );

  const fileReviewed = file !== undefined && files.reviewed.has(file.path);
  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make()
      .action(
        'tabs',
        {
          variant: 'custom',
          label: ['views.label', { ns: meta.profile.key }],
          render: () => tabs,
        },
        () => {},
      )
      // The one growing gap: everything after it sits at the trailing edge.
      .separator();

    if (tab === 'files') {
      builder
        .action(
          'previousFile',
          {
            label: ['previous-file.label', { ns: meta.profile.key }],
            icon: 'ph--caret-up--regular',
            disabled: !file,
            disposition: 'toolbar',
            testId: 'pull-request.toolbar.previous-file',
          },
          () => step(-1),
        )
        .action(
          'nextFile',
          {
            label: ['next-file.label', { ns: meta.profile.key }],
            icon: 'ph--caret-down--regular',
            disabled: !file,
            disposition: 'toolbar',
            testId: 'pull-request.toolbar.next-file',
          },
          () => step(1),
        )
        .action(
          'reviewed',
          {
            label: ['file-reviewed.label', { ns: meta.profile.key }],
            icon: fileReviewed ? 'ph--check-square--fill' : 'ph--square--regular',
            iconOnly: false,
            disabled: !file,
            disposition: 'toolbar',
            testId: 'pull-request.toolbar.reviewed',
          },
          () => handleToggleReviewed(),
        )
        .separator('line');
    }

    return builder
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
      .separator('line')
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
      .build();
  }, [
    tabs,
    tab,
    file,
    fileReviewed,
    step,
    handleToggleReviewed,
    busy,
    generating,
    walkthrough,
    pullRequest.url,
    state,
    handleApprove,
    handleGenerate,
    handleCopyLink,
    handleToggleComposer,
  ]);

  const details = useMemo<PullRequestDetailsValues>(
    () => ({
      reference,
      state,
      checks: status
        ? `${t(ciLabel[status.ci])}${status.checks.total > 0 ? ` ${status.checks.passed}/${status.checks.total}` : ''}`
        : t('ci-status.unknown.label'),
      branches:
        pullRequest.headBranch &&
        (pullRequest.baseBranch ? `${pullRequest.headBranch} → ${pullRequest.baseBranch}` : pullRequest.headBranch),
    }),
    [reference, state, status, pullRequest.headBranch, pullRequest.baseBranch, t],
  );

  const composerProps = {
    value: comment,
    busy,
    onValueChange: setComment,
    onSubmit: () => void handleComment(),
    onCancel: handleCloseComposer,
  };

  return (
    <Tabs.Root
      asChild
      orientation='horizontal'
      value={tab}
      onValueChange={(value) => setTab(TABS.find((candidate) => candidate === value) ?? 'overview')}
    >
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <ActionToolbar {...menuActions} attendableId={attendableId} />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Flex column>
            {composing && !lineTarget && <CommentBand {...composerProps} />}
            <LineCommentPopover
              {...composerProps}
              open={composing && !!lineTarget}
              anchorRef={lineAnchorRef}
              target={lineTarget?.target}
            />
            {/* Rendered by hand rather than through `Tabs.Panel`, so each tab's editor exists only while
              the tab is shown and is built against a visible, measured element. */}
            {tab === 'overview' && (
              <PullRequestOverview
                body={status?.body ?? pullRequest.description}
                details={details}
                runs={status?.runs}
              />
            )}
            {tab === 'walkthrough' &&
              (walkthrough ? (
                <WalkthroughView value={walkthrough.body} sidebar='full' onLineComment={handleWalkthroughLineComment} />
              ) : (
                <WalkthroughPlaceholder generating={generating} onGenerate={() => void handleGenerate()} />
              ))}
            {tab === 'files' && (
              <PullRequestFiles
                tree={files.tree}
                file={file}
                reviewed={files.reviewed}
                total={files.files.length}
                error={diff.error && t('files-error.message')}
                onSelect={files.select}
                onReviewedChange={setReviewed}
                onLineComment={diff.commit ? handleFilesLineComment : undefined}
              />
            )}
          </Flex>
        </Panel.Content>
      </Panel.Root>
    </Tabs.Root>
  );
};
