//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo, useRef } from 'react';

import { type Database, Filter, Obj, Tag, Type } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useQuery } from '@dxos/echo-react';
import { useAttention, useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type EditorController } from '@dxos/react-ui-editor';
import { Listbox } from '@dxos/react-ui-list';
import { GroupMenu, SortMenu } from '@dxos/react-ui-menu';
import { QueryEditor, usePersistentQuery } from '@dxos/react-ui-query';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { PullRequest, Task } from '@dxos/types';

import { meta } from '#meta';

import { useOpenObject, usePullRequestChecks } from '../../hooks/index.ts';
import * as PullRequestsView from '../../types/PullRequestsView.ts';
import {
  CI_HUE,
  type PullRequestChecks,
  type PullRequestRow,
  type PullRequestRowGroup,
  STATE_HUE,
  filterRows,
  groupRows,
  sortRows,
} from './arrange.ts';
import { formatRelative } from './format.ts';

const PULL_REQUEST_TYPENAME = Type.getTypename(PullRequest.PullRequest);

const SORT_ICONS: Record<PullRequestsView.SortField, string> = {
  relevance: 'ph--lightning--regular',
  updated: 'ph--clock-clockwise--regular',
  created: 'ph--calendar-plus--regular',
  number: 'ph--hash--regular',
  title: 'ph--text-aa--regular',
};

const GROUP_ICONS: Record<PullRequestsView.GroupField, string> = {
  none: 'ph--list--regular',
  repo: 'ph--git-branch--regular',
  state: 'ph--git-pull-request--regular',
  checks: 'ph--check-circle--regular',
  author: 'ph--user--regular',
};

export type PullRequestsArticleProps = {
  role?: string;
  attendableId: string;
  /** The space's database; absent when the type node carries no space, which renders nothing. */
  db?: Database.Database;
};

/**
 * Every pull request in a space as one list a reader triages from: repository, title, CI checks,
 * the tasks that track it and its state, ordered by relevance (what needs the reader first) or time.
 * The filter, order and grouping persist per device and per space, through the same view-state
 * aspect, query editor and sort/group menus a task set's list uses.
 */
export const PullRequestsArticle = ({ db, ...props }: PullRequestsArticleProps) =>
  db ? <PullRequestList db={db} {...props} /> : null;

PullRequestsArticle.displayName = 'PullRequestsArticle';

const PullRequestList = ({ role, attendableId, db }: PullRequestsArticleProps & { db: Database.Database }) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const editorRef = useRef<EditorController>(null);
  const contextId = db.spaceId;

  const [query, setQuery] = usePersistentQuery(PullRequestsView.aspect, contextId, editorRef);
  const { sort = PullRequestsView.DEFAULT_SORT, group = 'none' } = useViewState(PullRequestsView.aspect, contextId);
  const { update } = useViewStateActions(PullRequestsView.aspect, contextId);
  const handleSortChange = useCallback(
    (sort: PullRequestsView.Sort) => update((view) => ({ ...view, sort })),
    [update],
  );
  const handleGroupChange = useCallback(
    (group: PullRequestsView.GroupField) => update((view) => ({ ...view, group })),
    [update],
  );
  const handleClear = useCallback(() => setQuery(''), [setQuery]);

  const tags = useTagMap(db);
  // A query that does not parse matches nothing rather than everything.
  const filter = useMemo(() => {
    const text = query.trim();
    return text.length === 0 ? undefined : (new QueryBuilder(tags).build(text).filter ?? Filter.nothing());
  }, [query, tags]);

  const pullRequests = useQuery(db, Filter.type(PullRequest.PullRequest));
  const tasks = useQuery(db, Filter.type(Task.Task));
  const checks = usePullRequestChecks(pullRequests, db.spaceId);
  const { rows, groups } = useArrangedRows(pullRequests, tasks, checks, { filter, sort, group });
  // In display order, so keyboard order follows the groups the reader sees.
  const options = useMemo(
    () =>
      (groups ? groups.flatMap((group) => group.rows) : rows).map(({ pullRequest }) => ({
        value: pullRequest.id,
        label: pullRequest.title,
      })),
    [groups, rows],
  );

  const sortFields = useMemo(
    () =>
      PullRequestsView.SortField.literals.map((id) => ({
        id,
        label: t(`pull-requests-sort-${id}.label`),
        icon: SORT_ICONS[id],
      })),
    [t],
  );
  const directionLabels = useMemo(
    () => ({ asc: t('pull-requests-sort-asc.label'), desc: t('pull-requests-sort-desc.label') }),
    [t],
  );
  const groupFields = useMemo(
    () =>
      PullRequestsView.GroupField.literals.map((id) => ({
        id,
        label: t(`pull-requests-group-${id}.label`),
        icon: GROUP_ICONS[id],
      })),
    [t],
  );

  const openObject = useOpenObject();

  return (
    <Panel.Root role={role} data-testid='pull-requests'>
      <Panel.Header>
        <Toolbar.Root inactive={!hasAttention}>
          <QueryEditor
            classNames='grow min-w-0 ps-1'
            db={db}
            tags={tags}
            value={query}
            onChange={setQuery}
            ref={editorRef}
          />
          <SortMenu
            fields={sortFields}
            value={sort}
            onChange={handleSortChange}
            label={t('pull-requests-sort.label')}
            directionLabels={directionLabels}
            testId='pull-requests.sort'
          />
          <GroupMenu
            fields={groupFields}
            value={group}
            onChange={handleGroupChange}
            label={t('pull-requests-group.label')}
            none='none'
            testId='pull-requests.group'
          />
          <Button.Root
            icon='ph--x--regular'
            iconOnly
            disabled={query.trim().length === 0}
            label={t('pull-requests-filter-clear.label')}
            data-testid='pull-requests.filter.clear'
            onClick={handleClear}
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        {rows.length === 0 ? (
          <Status.Empty classNames='dx-expand'>
            {t(pullRequests.length === 0 ? 'pull-requests-empty.message' : 'pull-requests-no-match.message')}
          </Status.Empty>
        ) : (
          <Listbox.Root items={options}>
            <Listbox.Content
              classNames='dx-expand'
              aria-label={t('typename.label_other', { ns: PULL_REQUEST_TYPENAME })}
            >
              {groups
                ? groups
                    .filter((group) => group.rows.length > 0)
                    .map((group) => <GroupSection key={group.id} group={group} onOpen={openObject} />)
                : rows.map((row) => <PullRequestListRow key={row.pullRequest.id} row={row} onOpen={openObject} />)}
            </Listbox.Content>
          </Listbox.Root>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

type OpenHandler = (object: Obj.Any) => Promise<void>;

const GroupSection = ({ group, onOpen }: { group: PullRequestRowGroup; onOpen: OpenHandler }) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  return (
    <Listbox.ItemGroup>
      <Listbox.ItemGroupLabel>
        <Layout.Flex align='center' gap='sm'>
          <Icon.Icon icon={group.icon} classNames='dx-text' data-hue={group.hue} />
          <span className='truncate'>{group.translate ? t(group.label) : group.label}</span>
          <span className='text-description'>{group.rows.length}</span>
        </Layout.Flex>
      </Listbox.ItemGroupLabel>
      {group.rows.map((row) => (
        <PullRequestListRow key={row.pullRequest.id} row={row} onOpen={onOpen} />
      ))}
    </Listbox.ItemGroup>
  );
};

/** One pull request: its repository and number, title, author and time, then checks, tasks and state. */
const PullRequestListRow = ({
  row: { pullRequest, checks, tasks },
  onOpen,
}: {
  row: PullRequestRow;
  onOpen: OpenHandler;
}) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const time = pullRequest.updatedAt ?? pullRequest.createdAt;
  return (
    <Listbox.Item
      id={pullRequest.id}
      classNames='cursor-pointer py-2'
      data-testid='pull-requests.row'
      onClick={() => void onOpen(pullRequest)}
    >
      <Layout.Flex column gap='xs' grow>
        <Layout.Flex align='center' gap='sm' classNames='min-w-0'>
          <span className='dx-tag dx-tag-inline shrink-0' data-hue='neutral'>
            {PullRequest.reference(pullRequest)}
          </span>
          <span className='truncate grow'>{pullRequest.title}</span>
          <ChecksTag pullRequest={pullRequest} checks={checks} />
          <span
            className='dx-tag dx-tag-inline shrink-0'
            data-hue={STATE_HUE[pullRequest.state]}
            data-testid='pull-requests.row.state'
          >
            {t(`pull-request-state.${pullRequest.state}.label`)}
          </span>
        </Layout.Flex>
        <Layout.Flex align='center' gap='sm' classNames='min-w-0 text-xs text-description'>
          {pullRequest.author && <span className='shrink-0'>{pullRequest.author}</span>}
          {time && (
            <time className='shrink-0' dateTime={time} title={new Date(time).toLocaleString()}>
              {formatRelative(time)}
            </time>
          )}
          {tasks.length > 0 && (
            <Layout.Flex align='center' gap='xs' classNames='min-w-0' data-testid='pull-requests.row.tasks'>
              <Icon.Icon icon='ph--check-square-offset--regular' size='xs' classNames='shrink-0' />
              <span className='truncate'>{tasks.map((task) => task.title || t('untitled-task.label')).join(', ')}</span>
            </Layout.Flex>
          )}
        </Layout.Flex>
      </Layout.Flex>
    </Listbox.Item>
  );
};

const ChecksTag = ({ pullRequest, checks }: { pullRequest: PullRequest.PullRequest; checks?: PullRequestChecks }) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  // A finished pull request's checks are not read (see `usePullRequestChecks`), so it shows none.
  if (!checks) {
    return pullRequest.state === 'open' || pullRequest.state === 'draft' ? (
      <span className='dx-tag dx-tag-inline' data-hue='neutral' data-testid='pull-requests.row.checks'>
        {t('ci-status.unknown.label')}
      </span>
    ) : null;
  }

  return (
    <>
      {checks.review !== 'none' && (
        <span
          className='dx-tag dx-tag-inline'
          data-hue={checks.review === 'approved' ? 'green' : 'red'}
          data-testid='pull-requests.row.review'
        >
          {t(`review-status.${checks.review}.label`, { count: checks.approvals })}
        </span>
      )}
      <span className='dx-tag dx-tag-inline' data-hue={CI_HUE[checks.ci]} data-testid='pull-requests.row.checks'>
        {t(`ci-status.${checks.ci}.label`)}
        {checks.checks.total > 0 && ` ${checks.checks.passed}/${checks.checks.total}`}
      </span>
    </>
  );
};

type ArrangeOptions = {
  filter: Filter.Any | undefined;
  sort: PullRequestsView.Sort;
  group: PullRequestsView.GroupField;
};

/**
 * The rows the toolbar keeps, in the order it asks for, partitioned into its groups. Read through
 * atoms so a re-sync (a new state, a new title) or a task gaining the pull request as an artifact
 * re-arranges the list without the queries re-emitting.
 */
const useArrangedRows = (
  pullRequests: readonly PullRequest.PullRequest[],
  tasks: readonly Task.Task[],
  checks: ReadonlyMap<string, PullRequestChecks>,
  { filter, sort, group }: ArrangeOptions,
): { rows: readonly PullRequestRow[]; groups?: PullRequestRowGroup[] } => {
  const atom = useMemo(
    () =>
      Atom.make((get) => {
        pullRequests.forEach((pullRequest) => get(Obj.atom(pullRequest)));
        const tasksByPullRequest = new Map<string, Task.Task[]>();
        for (const task of tasks) {
          for (const ref of get(Obj.atomProperty(task, 'artifacts')) ?? []) {
            const id = Task.refEntityId(ref);
            if (id) {
              tasksByPullRequest.set(id, [...(tasksByPullRequest.get(id) ?? []), task]);
            }
          }
        }
        const all = pullRequests.map((pullRequest) => ({
          pullRequest,
          checks: checks.get(pullRequest.id),
          tasks: tasksByPullRequest.get(pullRequest.id) ?? [],
        }));
        const rows = sortRows(filterRows(all, filter), sort);
        return { rows, groups: groupRows(rows, group) };
      }),
    [pullRequests, tasks, checks, filter, sort, group],
  );

  return useAtomValue(atom);
};

/** Tag registry keyed by the `Tag` object's uri — the id space `#tag` terms and `meta.tags` share. */
const useTagMap = (db: Database.Database): Tag.Map => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  return useMemo(
    () =>
      tags.reduce<Tag.Map>((acc, tag) => {
        acc[Obj.getURI(tag).toString()] = tag;
        return acc;
      }, {}),
    [tags],
  );
};
