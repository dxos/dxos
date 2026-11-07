//
// Copyright 2026 DXOS.org
//

import { useAtomSet } from '@effect/atom-react';
import React, { useCallback, useMemo } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Translations from '@dxos/app-toolkit/Translations';
import { type SourceKey, formatSourceKey, isSpecKey } from '@dxos/deus/review';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as SpecModel from '@dxos/plugin-projects/SpecModel';
import * as SpecSession from '@dxos/plugin-projects/SpecSession';
import * as SpecViews from '@dxos/plugin-projects/SpecViews';
import { getSpace } from '@dxos/react-client/echo';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as Theme from '@dxos/react-ui/Theme';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { openExternalUrl } from '@dxos/util';

import { ApiSurface, CodeView, DataModelGraph, SPEC_INDEX, pendingReveal } from '#components';
import { CodeOperation, FeatureMap } from '#types';

import { CodeNamespace } from '../../namespace.ts';
import { SOFTWARE_FACTS, SPEC_VIEWS, type SpecViewId, isSpecView } from '../../spec-views.ts';
import { useGitHubText } from './useGitHubText.ts';
import { type SpecArticleModel, type SpecSource, useSpecModel } from './useSpecModel.ts';
import { fileKey, useSpecSyncState } from './useSpecSources.ts';

const isDiffAgainst = (value: string): value is SpecSession.DiffAgainst => value === 'base' || value === 'head';

/** A commit as people quote it; a branch name is kept whole. */
const shortSha = (ref: string): string => (/^[0-9a-f]{40}$/.test(ref) ? ref.slice(0, 7) : ref);

/** A remote-tracking ref as people say it: `origin/main` is `main`. */
const shortRef = (ref: string): string => ref.replace(/^origin\//, '');

/**
 * Follows a `github:` key from the spec: the spec's own item scrolls its editor, another spec opens as its own synced
 * Spec, and code shows in the panel's code view.
 */
export const useOpenSource = ({
  spec,
  id,
  key,
  setSession,
}: Pick<SpecArticleModel, 'id' | 'key' | 'setSession'> & SpecSource) => {
  const space = spec ? getSpace(spec) : undefined;
  const { invokePromise } = AppHooks.useOperationInvoker();
  const setPendingReveal = useAtomSet(pendingReveal);
  const showCode = useCallback(
    (target: SourceKey) =>
      setSession((current) => ({
        ...current,
        evidence: target,
        focus: 'review',
        views: { ...current.views, review: 'code' },
      })),
    [setSession],
  );
  return useCallback(
    async (target: SourceKey) => {
      if (!isSpecKey(target)) {
        showCode(target);
        return;
      }
      if (key && fileKey(target) === fileKey(key)) {
        if (target.fragment) {
          SpecSession.reveal(id, target.fragment);
        }
        return;
      }
      // Another spec opens as its own synced Spec in this space; outside a space it is shown read-only here.
      if (space) {
        const { data, error } = await invokePromise(
          CodeOperation.ImportSpec,
          { key: formatSourceKey(target, false) },
          { spaceId: space.id },
        );
        const other = data && (await data.spec.load());
        if (other) {
          setPendingReveal(target.fragment ? { path: target.path, item: target.fragment } : undefined);
          await invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(other)] });
          return;
        }
        log.warn('spec not imported', { key: formatSourceKey(target), error });
      }
      showCode(target);
    },
    [id, key, space, invokePromise, showCode, setPendingReveal],
  );
};

export type SpecViewContentProps = SpecSource & {
  view: SpecViewId;
};

/**
 * One view of a spec that reads code: its data model, its API, or the code a review cites. It shares its session with
 * the spec's editor, wherever that is open.
 */
export const SpecViewContent = ({ view, ...source }: SpecViewContentProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const sync = useSpecSyncState();
  const { session, text, texts, reviews, review, codePath } = useSpecModel(source);
  const { evidence, selectedVerdict, selectedReview } = session;
  const shownReview = useMemo(() => {
    const picked = selectedReview && reviews.find(({ id }) => id === selectedReview);
    return picked ? SpecModel.toReviewModel(picked) : review;
  }, [reviews, review, selectedReview]);

  // A local checkout holds today's code, so an earlier review's evidence, like any without a checkout, is read from
  // GitHub at the commit that was reviewed: the selected verdict's own, since the current status merges several.
  const verdictCommit = shownReview?.verdicts.find(({ id }) => id === selectedVerdict)?.review?.commit;
  const codeIsLocal =
    sync.available &&
    codePath !== undefined &&
    shownReview === review &&
    (verdictCommit === undefined || verdictCommit === review?.commit);
  const codeRef = verdictCommit ?? shownReview?.commit ?? 'main';
  const remoteCode = useGitHubText(codeIsLocal ? undefined : evidence, codeRef);
  const codeText = codeIsLocal
    ? evidence && texts.get(fileKey(evidence))
    : remoteCode.status === 'ready'
      ? remoteCode.text
      : undefined;
  const codeError =
    remoteCode.status !== 'error'
      ? undefined
      : remoteCode.error.status === undefined
        ? t('code-view.github-unreachable.label', { url: remoteCode.url })
        : t('code-view.github-error.label', { status: remoteCode.error.status, url: remoteCode.url });
  const openExternal = useCallback(
    (line?: number) =>
      codePath && void openExternalUrl(`vscode://file${codePath}${line !== undefined ? `:${line}` : ''}`),
    [codePath],
  );

  switch (view) {
    case 'code':
      return evidence ? (
        <CodeView
          label={formatSourceKey(evidence)}
          path={evidence.path}
          content={codeText}
          symbol={evidence.fragment}
          source={codeIsLocal ? undefined : t('code-view.github-source.label', { ref: shortSha(codeRef) })}
          error={codeError}
          onOpenExternal={codeIsLocal ? openExternal : undefined}
        />
      ) : (
        <Status.Empty classNames='dx-fill' data-testid='code-view.empty'>
          {t('code-view.empty.label')}
        </Status.Empty>
      );
    case 'data':
      return <DataModelGraph content={text} />;
    case 'api':
      return <ApiSurface content={text} />;
  }
};

/** What the reader of a spec's companion views gets from the checkout: diff base, named specs, cited files, links. */
const useSources = (source: SpecSource): ProjectCapabilities.SpecSources => {
  const { id, key, setSession, baseText, specs, read } = useSpecModel(source);
  const open = useOpenSource({ ...source, id, key, setSession });
  const onOpenSource = useCallback((target: SourceKey) => void open(target), [open]);
  return useMemo(
    () => ({ base: baseText, specs, index: SPEC_INDEX, read, onOpenSource }),
    [baseText, specs, read, onOpenSource],
  );
};

/** Gives an ECHO spec's companion views what it reads from the checkout. */
export const SpecSourcesProvider = ({ spec, children }: ProjectCapabilities.SpecSourcesProviderProps) => {
  const sources = useSources({ spec });
  return <>{children(sources)}</>;
};

/**
 * Where a spec comes from and what diff mode compares it with: the diff and fold switches, its pull request or branch,
 * its file and its sync state, for a host toolbar to place.
 */
export const SpecSourceToolbar = (source: SpecSource) => {
  const { spec } = source;
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const sync = useSpecSyncState();
  const { session, setSession, key, git, diffAvailable } = useSpecModel(source);
  const { diff, fold } = session;
  const update = useCallback(
    (patch: Partial<SpecSession.State>) => setSession((current) => ({ ...current, ...patch })),
    [setSession],
  );
  const syncEntry = spec ? sync.specs[spec.id] : undefined;
  const pullRequest = git?.pullRequest;
  return (
    <>
      {diffAvailable && (
        <>
          <Toolbar.Separator />
          <Toolbar.ToggleGroup
            type='single'
            value={diff ?? ''}
            onValueChange={(value) => update({ diff: isDiffAgainst(value) ? value : undefined })}
            aria-label={t('spec-diff.label')}
          >
            <ToggleGroup.Item
              value='base'
              icon='ph--git-diff--regular'
              label={t('spec-diff.base.label', { base: shortRef(git?.base ?? 'base') })}
              disabled={git !== undefined && !git.mergeBase}
              iconOnly
              data-testid='spec-article.diff.base'
            />
            {git && (
              <ToggleGroup.Item
                value='head'
                icon='ph--git-commit--regular'
                label={t('spec-diff.head.label')}
                iconOnly
                data-testid='spec-article.diff.head'
              />
            )}
          </Toolbar.ToggleGroup>
          {diff && (
            <Toolbar.ToggleGroup
              type='single'
              value={fold ? 'fold' : ''}
              onValueChange={(value) => update({ fold: value === 'fold' })}
              aria-label={t('spec-diff.fold.label')}
            >
              <ToggleGroup.Item
                value='fold'
                icon='ph--arrows-in-line-vertical--regular'
                label={t('spec-diff.fold.label')}
                iconOnly
                data-testid='spec-article.diff.fold'
              />
            </Toolbar.ToggleGroup>
          )}
        </>
      )}
      {pullRequest ? (
        <Toolbar.Link
          href={pullRequest.url}
          title={`${pullRequest.title} (${git?.branch} → ${pullRequest.base})`}
          onClick={(event) => {
            event.preventDefault();
            void openExternalUrl(pullRequest.url);
          }}
          data-testid='spec-article.pull-request'
        >
          <Tag.Tag hue='info'>
            <Icon.Icon icon='ph--git-pull-request--regular' size='xs' />#{pullRequest.number}
          </Tag.Tag>
        </Toolbar.Link>
      ) : (
        git?.branch && (
          <Tag.Tag title={`${git.branch} → ${shortRef(git.base)}`} data-testid='spec-article.branch'>
            <Icon.Icon icon='ph--git-branch--regular' size='xs' />
            {git.branch}
          </Tag.Tag>
        )
      )}
      {key && (
        <Toolbar.Text classNames='font-mono text-xs'>
          <span title={formatSourceKey(key)}>{key.path.split('/').slice(-2).join('/')}</span>
        </Toolbar.Text>
      )}
      {syncEntry && (
        <Tag.Tag
          hue={syncEntry.status === 'error' || syncEntry.status === 'conflict' ? 'warning' : 'neutral'}
          title={syncEntry.error ?? syncEntry.path}
          data-testid='spec-article.sync-status'
          data-status={syncEntry.status}
        >
          <Icon.Icon icon='ph--arrows-clockwise--regular' size='xs' />
          {t(`spec-sync.${syncEntry.status}.label`)}
        </Tag.Tag>
      )}
    </>
  );
};

export type SpecPanelProps = SpecSource & {
  readOnly?: boolean;
};

type PanelView = { id: string; group: SpecSession.Group; icon: string; label: Translations.Label };

/** Every view of a software spec, the generic ones and this plugin's, in companion tab order. */
const PANEL_VIEWS: readonly PanelView[] = [
  ...SpecViews.SPEC_VIEWS,
  ...SPEC_VIEWS.map(({ id, group, icon }): PanelView => ({
    id,
    group,
    icon,
    label: [`spec-view.${id}.label`, { ns: CodeNamespace.key }],
  })),
].sort((a, b) => SpecSession.GROUPS.indexOf(a.group) - SpecSession.GROUPS.indexOf(b.group));

const groupOf = (view: string): SpecSession.Group | undefined => PANEL_VIEWS.find(({ id }) => id === view)?.group;

/**
 * Every view of a spec in one panel, for a spec with no node to give companions (a bundled plugin spec): it shows the
 * view of the group last asked for.
 */
export const SpecPanel = ({ readOnly = false, ...source }: SpecPanelProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { spec } = source;
  const [specDialects] = useObject(spec, 'dialects');
  const model = useSpecModel(source);
  const { id, session, setSession, text, reviews, review, reviewKey } = model;
  const sources = useSources(source);
  // A bundled spec names no dialects; it is a plugin's, so it is read as software.
  const dialects = useMemo(
    () => (specDialects && specDialects.length > 0 ? specDialects : [FeatureMap.SOFTWARE_DIALECT]),
    [specDialects],
  );
  const group = session.focus ?? 'structure';
  const view =
    PANEL_VIEWS.find(({ id }) => id === session.views[group])?.id ??
    PANEL_VIEWS.find((view) => view.group === group)!.id;
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.ToggleGroup
            type='single'
            value={view}
            onValueChange={(value) => {
              const next = groupOf(value);
              if (next) {
                setSession((current) => ({ ...current, focus: next, views: { ...current.views, [next]: value } }));
              }
            }}
            aria-label={t('spec-view.label')}
          >
            {PANEL_VIEWS.map(({ id, icon, label }) => (
              <ToggleGroup.Item
                key={id}
                value={id}
                icon={icon}
                label={Theme.toLocalizedString(label, t)}
                // Only the open view is labelled, so the toolbar fits a narrow panel.
                iconOnly={id !== view}
                data-testid={`spec-article.view.${id}`}
              />
            ))}
          </Toolbar.ToggleGroup>
          <SpecSourceToolbar {...source} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='relative' data-testid='spec-article.panel' data-view={view}>
        {SpecViews.isSpecView(view) ? (
          <SpecViews.SpecCompanionView
            {...sources}
            view={view}
            id={id}
            spec={spec}
            text={text}
            dialects={dialects}
            reviews={reviews}
            review={review}
            reviewKey={reviewKey}
            facts={SOFTWARE_FACTS}
            readOnly={readOnly}
          />
        ) : (
          isSpecView(view) && <SpecViewContent {...source} view={view} />
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
