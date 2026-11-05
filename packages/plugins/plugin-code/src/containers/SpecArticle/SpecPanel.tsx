//
// Copyright 2026 DXOS.org
//

import { useAtomSet } from '@effect/atom-react';
import React, { useCallback, useMemo } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type SourceKey, formatSourceKey, isSpecKey } from '@dxos/deus/review';
import { Doc } from '@dxos/echo-doc';
import { useIdentity } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { openExternalUrl } from '@dxos/util';

import {
  ApiSurface,
  ChangelogGraph,
  CodeView,
  DataModelGraph,
  DecisionLog,
  DefinitionGraph,
  type DefinitionModel,
  ReviewPanel,
  SPEC_INDEX,
  answerQuestion,
  pendingReveal,
  toUserHandle,
} from '#components';
import { SpecReviews } from '#sync';
import { CodeOperation } from '#types';

import { CodeNamespace } from '../../namespace.ts';
import { type View, VIEWS, getEditor, isView, reveal } from './spec-session.ts';
import { useGitHubText } from './useGitHubText.ts';
import { type SpecModel, type SpecSource, useSpecModel } from './useSpecModel.ts';
import { type DiffAgainst, fileKey, useSpecSyncState } from './useSpecSources.ts';

const VIEW_ICON: Record<View, string> = {
  definitions: 'ph--tree-structure--regular',
  review: 'ph--seal-check--regular',
  code: 'ph--file-code--regular',
  log: 'ph--users-three--regular',
  decisions: 'ph--graph--regular',
  data: 'ph--database--regular',
  api: 'ph--plugs-connected--regular',
};

const isDiffAgainst = (value: string): value is DiffAgainst => value === 'base' || value === 'head';

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
}: Pick<SpecModel, 'id' | 'key' | 'setSession'> & SpecSource) => {
  const space = spec ? getSpace(spec) : undefined;
  const { invokePromise } = AppHooks.useOperationInvoker();
  const setPendingReveal = useAtomSet(pendingReveal);
  const showCode = useCallback(
    (target: SourceKey) => setSession((current) => ({ ...current, codeTarget: target, view: 'code' })),
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
          reveal(id, target.fragment);
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

export type SpecPanelProps = SpecSource & {
  /** Whether answers to the changelog's questions are taken; an ECHO spec takes them unless read-only. */
  readOnly?: boolean;
};

/**
 * The views of a spec beside its text: its definitions, review, cited code, decision log and graph, data model and
 * API. It shares its session with the spec's editor, wherever that is open, so either moves the other to an item.
 */
export const SpecPanel = ({ readOnly = false, ...source }: SpecPanelProps) => {
  const { spec } = source;
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const identity = useIdentity();
  const sync = useSpecSyncState();
  const model = useSpecModel(source);
  const { id, session, setSession, target, key, reviewKey, text, texts, reviews, review, read, specs, changelog } =
    model;
  const { codePath, git, baseText, diffAvailable } = model;
  const { view, codeTarget, selectedVerdict, selectedReview, selectedDecision, diff, fold } = session;

  // The review view shows the current status or one review; the editor's chips always show the current status.
  const history = useMemo(
    () => reviews.map(({ id, date, by, commit }) => ({ id, label: `${date} · ${by} · ${commit.slice(0, 7)}` })),
    [reviews],
  );
  const shownReview = useMemo(() => {
    const picked = selectedReview && reviews.find(({ id }) => id === selectedReview);
    return picked ? SpecReviews.toModel(picked) : review;
  }, [reviews, review, selectedReview]);

  const update = useCallback(
    (patch: Partial<typeof session>) => setSession((current) => ({ ...current, ...patch })),
    [setSession],
  );

  const open = useOpenSource({ ...source, id, key, setSession });

  const activate = useCallback(
    (definition: DefinitionModel) =>
      definition.external ? void open(definition.external.key) : reveal(id, definition.id),
    [id, open],
  );

  const selectVerdict = useCallback(
    (verdict: string) => {
      update({ selectedVerdict: verdict });
      // The card list keeps focus, so the arrow keys keep moving through the verdicts.
      reveal(id, verdict, false);
    },
    [id, update],
  );

  // Through the open editor when there is one, so the answer reaches collaborators like a typed edit; else as a
  // minimal change to the spec's text.
  const handleAnswer = useCallback(
    (question: string, answer: string) => {
      const editor = getEditor(id);
      const current = editor ? editor.state.doc.toString() : text;
      const name = identity?.displayName;
      const edit = answerQuestion(current, {
        question,
        answer,
        by: `user:${name ? toUserHandle(name) : identity?.did}`,
        date: new Date().toISOString().slice(0, 10),
      });
      if (!edit) {
        log.warn('answer not recorded: no changelog', { question });
        return;
      }
      if (editor) {
        editor.dispatch({ changes: edit });
      } else if (target) {
        Doc.updateText(target, ['content'], current.slice(0, edit.from) + edit.insert + current.slice(edit.to));
      }
      update({ selectedDecision: question });
    },
    [id, identity, text, target, update],
  );
  // Only an editable spec bound to ECHO takes answers; a static or read-only one lists its questions.
  const canAnswer = !readOnly && spec !== undefined && identity !== undefined;

  const syncEntry = spec ? sync.specs[spec.id] : undefined;
  const pullRequest = git?.pullRequest;
  // A local checkout holds today's code, so an earlier review's evidence, like any without a checkout, is read from
  // GitHub at the commit that was reviewed: the selected verdict's own, since the current status merges several.
  const codeIsLocal = sync.available && codePath !== undefined && shownReview === review;
  const verdictCommit = shownReview?.verdicts.find(({ id }) => id === selectedVerdict)?.review?.commit;
  const codeRef = verdictCommit ?? shownReview?.commit ?? 'main';
  const remoteCode = useGitHubText(codeIsLocal ? undefined : codeTarget, codeRef);
  const codeText = codeIsLocal
    ? codeTarget && texts.get(fileKey(codeTarget))
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

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.ToggleGroup
            type='single'
            value={view}
            onValueChange={(value) => isView(value) && update({ view: value })}
            aria-label={t('spec-view.label')}
          >
            {VIEWS.map((value) => (
              <ToggleGroup.Item
                key={value}
                value={value}
                icon={VIEW_ICON[value]}
                label={t(`spec-view.${value}.label`)}
                // Only the open view is labelled, so the toolbar fits a narrow panel.
                iconOnly={value !== view}
                data-testid={`spec-article.view.${value}`}
              />
            ))}
          </Toolbar.ToggleGroup>
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
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='relative' data-testid='spec-article.panel' data-view={view}>
        {view === 'definitions' && (
          <DefinitionGraph
            content={text}
            base={baseText}
            specs={specs}
            index={SPEC_INDEX}
            review={review}
            onActivate={activate}
          />
        )}
        {view === 'review' && (
          <ReviewPanel
            review={shownReview}
            history={history}
            selectedReview={shownReview === review ? undefined : selectedReview}
            onSelectReview={(next) => update({ selectedReview: next })}
            reviewKey={reviewKey}
            selected={selectedVerdict}
            onSelect={selectVerdict}
            onOpenCode={(target) => void open(target)}
            read={read}
          />
        )}
        {view === 'code' &&
          (codeTarget ? (
            <CodeView
              label={formatSourceKey(codeTarget)}
              path={codeTarget.path}
              content={codeText}
              symbol={codeTarget.fragment}
              source={codeIsLocal ? undefined : t('code-view.github-source.label', { ref: shortSha(codeRef) })}
              error={codeError}
              onOpenExternal={codePath ? openExternal : undefined}
            />
          ) : (
            <Status.Empty classNames='dx-fill' data-testid='code-view.empty'>
              {t('code-view.empty.label')}
            </Status.Empty>
          ))}
        {view === 'log' && (
          <DecisionLog
            content={changelog}
            selected={selectedDecision}
            onAnswer={canAnswer ? handleAnswer : undefined}
          />
        )}
        {view === 'decisions' && <ChangelogGraph content={changelog} selected={selectedDecision} />}
        {view === 'data' && <DataModelGraph content={text} />}
        {view === 'api' && <ApiSurface content={text} />}
      </Panel.Body>
    </Panel.Root>
  );
};
