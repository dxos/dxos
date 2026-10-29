//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import * as Semaphore from 'effect/Semaphore';

import * as Capability from '@dxos/app-framework/Capability';
import * as ConnectorSync from '@dxos/app-toolkit/ConnectorSync';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Progress from '@dxos/app-toolkit/Progress';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import * as Binding from '@dxos/plugin-connector/Binding';
import { Milestone, Organization, Person, PullRequest, Repo, Task, TaskSet } from '@dxos/types';

import { GitHubCapabilities, GitHubOperation } from '#types';

import { GITHUB_SOURCE } from '../constants.ts';
import { GitHubRepoInaccessibleError, GitHubRepoUnresolvedError, formatGitHubSyncFailure } from '../errors.ts';
import { type FileSyncResult, isFileBinding, syncFileBinding } from '../file-sync/sync-files.ts';
import { GitHubNamespace } from '../namespace.ts';
import { GitHubApi } from '../services/index.ts';
import { ensureRepo, toRepoDescriptor } from './repo.ts';

const { mergeField, snapshotField } = ConnectorSync;

//
// Polling sync of one bound repository (spec/SYNC.mdl).
//
// A binding is a `Cursor` whose target is a `Repo`. Each poll reads one delta - the repository's
// issues and pull requests updated since `Cursor.max`, newest first, sent with the ETag of the last
// delta in `Cursor.spec.token` - so a quiet repository costs a single `304`. Pull requests in the
// delta, plus open ones whose checks are still pending (a CI result does not move `updated_at`), are
// then read in one GraphQL batch. Issues keep the snapshot-driven three-way merge and push of title,
// description and status; pull requests are pull-only.
//
// Snapshots live on `Cursor.spec.snapshots[<github id>]`. The repository's entry also records when
// the repository and its organization were last read, since those are read hourly and daily rather
// than on every poll.
//
// Attribution caveat: pushed edits are attributed to the GitHub App / OAuth user that owns the
// connection token, not to the local user who made the edit.
//

//
// Tunables
//

/** Per-repo issue parallelism. */
const ISSUE_CONCURRENCY = 4;

/** How often a binding re-reads its repository's metadata and milestones. */
const REPO_READ_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Pages of 100 one backfill run reads, oldest first, before it saves its watermark and runs again, so a
 * large repository's first sync advances in resumable chunks.
 */
const BACKFILL_PAGES = 10;

/** How often a binding re-reads its organization and members. */
const MEMBERS_READ_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Subtracted from the newest `updated_at` before it becomes the watermark: GitHub's `since` has
 * second precision, so an item updated in the same second as the watermark is read again rather
 * than missed. Snapshots make that re-read a no-op.
 */
const WATERMARK_OVERLAP_MS = 5_000;

//
// Snapshot field shapes (stored on Cursor's `spec.snapshots`)
//

/**
 * Last-pulled repository fields, plus when the repository and its organization were last read.
 * `name` is recorded but not pushed - see {@link GitHubApi.updateRepo}.
 */
type RepoSnapshot = {
  name: string;
  description: string;
  /** ETag of the last repository read; sent as `If-None-Match`. */
  etag?: string;
  /** Epoch milliseconds of the last repository read. */
  readAt?: number;
  /** Epoch milliseconds of the last organization and members read. */
  membersReadAt?: number;
};

type TaskSnapshot = {
  title: string;
  description: string;
  status: 'todo' | 'done';
};

//
// Foreign-key + lookup helpers
//

const fkFor = (id: string | number) => ({ source: GITHUB_SOURCE, id: String(id) });

/**
 * Generic foreign-key lookup. Type is forwarded to `Filter.foreignKeys`
 * untyped - the caller supplies the result type via the explicit `T` parameter
 * (mirrors how plugin-trello casts after `Database.query(...).run`).
 */
const findByForeignId = <T>(type: Type.AnyEntity, id: string | number) =>
  Effect.gen(function* () {
    const results = yield* Database.query(Query.select(Filter.foreignKeys(type as never, [fkFor(id)]))).run;
    return results.length > 0 ? (results[0] as T) : undefined;
  });

/**
 * The `TaskSet` that mirrors a repository's issues: the one carrying the repository's github.com
 * foreign key, created when the space holds none. It has no field naming the repository.
 */
export const ensureIssueSet = Effect.fn('ensureIssueSet')(function* (repo: Repo.Repo, repoId: string) {
  const existing = yield* findByForeignId<TaskSet.TaskSet>(TaskSet.TaskSet, repoId);
  if (existing) {
    return existing;
  }
  return yield* Database.add(TaskSet.make({ [Obj.Meta]: { keys: [fkFor(repoId)] }, name: Repo.fullName(repo) }));
});

//
// Field mappers (GitHub <-> DXOS)
//

/**
 * Maps GitHub issue state to a Task status. GitHub issues only have `open` /
 * `closed` - there's no "in progress" concept, so we collapse open->`todo` and
 * closed->`done`.
 */
const issueStateToTaskStatus = (state: string): 'todo' | 'done' => (state === 'closed' ? 'done' : 'todo');

/**
 * Reverse of {@link issueStateToTaskStatus}. `'started'` is collapsed to
 * `open` since GitHub has no equivalent state. Returns undefined when the
 * status is unrecognised so the caller can skip the push instead of failing.
 */
const taskStatusToIssueState = (status: string | undefined): 'open' | 'closed' | undefined => {
  switch (status) {
    case 'done':
      return 'closed';
    case 'todo':
    case 'started':
      return 'open';
    default:
      return undefined;
  }
};

const sinceFromOptions = (options: GitHubOperation.SyncOptions | undefined, now: number): string | undefined => {
  const days = options?.maxDaysBack;
  if (typeof days !== 'number' || days <= 0) {
    return undefined;
  }
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
};

/** GitHub reports `due_on` as an ISO datetime; `Milestone.targetDate` is date-only. */
const dueOnToTargetDate = (dueOn: string | null | undefined): string | undefined => dueOn?.slice(0, 10) ?? undefined;

/** GitHub's check rollup; `undefined` when the commit has no checks, so it never counts as pending. */
const toCheckState = (detail: GitHubApi.PullRequestDetail): PullRequest.CheckState | undefined => {
  switch (detail.statusCheckRollup?.state) {
    case 'SUCCESS':
      return 'success';
    case 'FAILURE':
    case 'ERROR':
      return 'failure';
    case 'PENDING':
    case 'EXPECTED':
      return 'pending';
    default:
      return undefined;
  }
};

const toReviewDecision = (detail: GitHubApi.PullRequestDetail): PullRequest.ReviewDecision | undefined => {
  switch (detail.reviewDecision) {
    case 'APPROVED':
      return 'approved';
    case 'CHANGES_REQUESTED':
      return 'changes_requested';
    case 'REVIEW_REQUIRED':
      return 'review_required';
    default:
      return undefined;
  }
};

/** A pull request's state from the delta item, refined by the GraphQL detail when there is one. */
const toPullRequestState = (
  item: GitHubApi.DeltaItem | undefined,
  detail: GitHubApi.PullRequestDetail | undefined,
  previous: PullRequest.State | undefined,
): PullRequest.State => {
  if (detail?.merged || item?.pull_request?.merged_at) {
    return 'merged';
  }
  const closed = item ? item.state === 'closed' : previous === 'closed';
  if (closed) {
    return 'closed';
  }
  if (detail) {
    return detail.isDraft ? 'draft' : 'open';
  }
  return previous === 'draft' ? 'draft' : 'open';
};

/**
 * Move a task into `container`. Idempotent - sync runs repeatedly and must never append a second
 * ref for a task already in the set.
 */
export const setTaskContainer = Effect.fn('setTaskContainer')(function* (task: Task.Task, container: TaskSet.TaskSet) {
  const listed = container.tasks.some(Ref.hasEntityId(task.id));
  // A stale entry for a task now parented elsewhere is not membership; it still needs re-rooting.
  if (listed && Obj.getParent(task)?.id === container.id) {
    return;
  }
  yield* removeFromContainers(task, container);
  if (!listed) {
    Obj.update(container, (container) => {
      container.tasks.push(Ref.make(task));
    });
  }
  // `tasks` claims only an unparented task, so a move between sets moves the edge itself.
  Obj.setParent(task, container);
});

/** Drops `task` from every set and parent task that lists it, except `keep`. */
const removeFromContainers = Effect.fn('removeFromContainers')(function* (task: Task.Task, keep?: TaskSet.TaskSet) {
  // The reverse-ref index, not `Obj.getParent`: legacy sets may hold refs to tasks whose parent
  // edge has not yet been healed to the set, and every holder must drop its stale entry.
  const previous = yield* Database.query(
    Query.select(Filter.id(task.id)).referencedBy(TaskSet.TaskSet, 'tasks'),
  ).run.pipe(Effect.orElseSucceed(() => []));
  for (const set of previous) {
    if (set.id === keep?.id) {
      continue;
    }
    Obj.update(set, (set) => {
      TaskSet.removeRefsInPlace(set.tasks, new Set([task.id]));
    });
  }
  // A task filed as a sub-task is listed by its parent rather than a set; it leaves that list too.
  const parent = Task.getParentTask(task);
  if (parent) {
    Obj.update(parent, (parent) => {
      TaskSet.removeRefsInPlace(parent.subtasks ?? [], new Set([task.id]));
    });
  }
});

//
// Pull (snapshot-driven three-way merge for Repo + Task; simple upsert for Org/Person/PullRequest)
//

const upsertOrganization = Effect.fn('upsertOrganization')(function* (org: GitHubApi.GitHubOrg) {
  const existing = yield* findByForeignId<Organization.Organization>(Organization.Organization, org.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      existing.name = org.name ?? org.login;
      if (org.description != null) {
        existing.description = org.description;
      }
      if (org.blog) {
        existing.website = org.blog;
      }
      if (org.avatar_url) {
        existing.image = org.avatar_url;
      }
    });
    return existing;
  }
  const created = Obj.make(Organization.Organization, {
    [Obj.Meta]: { keys: [fkFor(org.id)] },
    name: org.name ?? org.login,
    description: org.description ?? undefined,
    website: org.blog ?? undefined,
    image: org.avatar_url ?? undefined,
  });
  return yield* Database.add(created);
});

const upsertPerson = Effect.fn('upsertPerson')(function* (
  user: GitHubApi.GitHubUser,
  organization: Organization.Organization | undefined,
) {
  const existing = yield* findByForeignId<Person.Person>(Person.Person, user.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      existing.fullName = user.name ?? user.login;
      if (user.avatar_url) {
        existing.image = user.avatar_url;
      }
      if (organization && !existing.organization) {
        existing.organization = Ref.make(organization);
      }
      // Add the GitHub login identity if not already present.
      const ids = existing.identities ?? [];
      if (!ids.some((entry: { value: string }) => entry.value === user.login)) {
        (existing.identities ??= []).push({ label: 'github', value: user.login });
      }
    });
    return existing;
  }
  const created = Person.make({
    [Obj.Meta]: { keys: [fkFor(user.id)] },
    fullName: user.name ?? user.login,
    image: user.avatar_url ?? undefined,
    organization: organization ? Ref.make(organization) : undefined,
    identities: [{ label: 'github', value: user.login }],
  });
  return yield* Database.add(created);
});

/**
 * Merge a repository read into the bound `Repo`. `name` and `description` go through the three-way
 * merge against the snapshot; the URL and default branch are GitHub's alone, so they are copied.
 */
const upsertRepo = Effect.fn('upsertRepo')(function* (
  binding: Cursor.ExternalCursor,
  local: Repo.Repo,
  remote: GitHubApi.GitHubRepo,
  read: Pick<RepoSnapshot, 'etag' | 'readAt'>,
) {
  const fid = String(remote.id);
  const snapshot = Cursor.readSnapshot<RepoSnapshot>(binding, fid);
  const remoteFields = { name: remote.name, description: remote.description ?? '' };
  const nameResult = mergeField<string>(local.name, remoteFields.name, snapshotField(snapshot, 'name'));
  const descriptionResult = mergeField<string | undefined>(
    local.description,
    remoteFields.description,
    snapshotField(snapshot, 'description'),
  );
  const url = remote.html_url ?? undefined;
  const defaultBranch = remote.default_branch ?? undefined;
  Obj.update(local, (local) => {
    if (nameResult.source === 'remote' && local.name !== nameResult.value) {
      local.name = nameResult.value;
    }
    if (descriptionResult.source === 'remote' && local.description !== descriptionResult.value) {
      local.description = descriptionResult.value || undefined;
    }
    if (url !== undefined && local.url !== url) {
      local.url = url;
    }
    if (defaultBranch !== undefined && local.defaultBranch !== defaultBranch) {
      local.defaultBranch = defaultBranch;
    }
  });
  Cursor.writeSnapshot(binding, fid, { ...snapshot, ...remoteFields, ...read });
});

/**
 * Pull a GitHub milestone into ECHO. Mirrored remote-wins without a snapshot merge - milestones
 * are pull-only (nothing here pushes milestone edits back), so there is no local side to protect.
 */
export const upsertMilestone = Effect.fn('upsertMilestone')(function* (
  taskSet: TaskSet.TaskSet,
  remote: GitHubApi.GitHubMilestone,
) {
  const name = remote.title;
  const description = remote.description ?? undefined;
  // GitHub's open/closed milestone state is deliberately not mapped: `Milestone` derives progress
  // from its tasks, so a stored status could contradict the work it contains.
  const targetDate = dueOnToTargetDate(remote.due_on);

  const existing = yield* findByForeignId<Milestone.Milestone>(Milestone.Milestone, remote.id);
  const milestone =
    existing ??
    (yield* Database.add(Milestone.make({ [Obj.Meta]: { keys: [fkFor(remote.id)] }, name, description, targetDate })));
  if (
    existing &&
    (existing.name !== name || existing.description !== description || existing.targetDate !== targetDate)
  ) {
    Obj.update(existing, (existing) => {
      existing.name = name;
      existing.description = description;
      existing.targetDate = targetDate;
    });
  }
  // Sequence is the `milestones` array; the parent edge only carries deletion cascade.
  if (!taskSet.milestones.some(Ref.hasEntityId(milestone.id))) {
    Obj.update(taskSet, (taskSet) => {
      taskSet.milestones.push(Ref.make(milestone));
    });
    Obj.setParent(milestone, taskSet);
  }
  return milestone;
});

/**
 * Pull a GitHub issue into ECHO as a Task, three-way merging {title, description, status} against
 * the binding's snapshot. Non-mapped fields (`Task.priority`, `Task.estimate`, etc.) are preserved.
 *
 * Set membership is NOT wired here: this runs concurrently per issue and `TaskSet.tasks` is a
 * shared array, so the caller applies {@link setTaskContainer} sequentially afterwards.
 *
 * `milestone` is the local mirror of `issue.milestone`, mirrored remote-wins outside the snapshot
 * merge (nothing pushes milestone edits back, so there is no local side to protect).
 */
export const upsertTask = Effect.fn('upsertTask')(function* (
  binding: Cursor.ExternalCursor,
  issue: GitHubApi.GitHubIssue,
  assignedPerson: Person.Person | undefined,
  milestone: Milestone.Milestone | undefined,
) {
  const remoteFields: Required<TaskSnapshot> = {
    title: issue.title,
    description: issue.body ?? '',
    status: issueStateToTaskStatus(issue.state),
  };
  const fid = String(issue.id);
  const existing = yield* findByForeignId<Task.Task>(Task.Task, issue.id);

  if (existing) {
    const snapshot = Cursor.readSnapshot<TaskSnapshot>(binding, fid);
    // Task.title is required (non-optional) so the merge produces a string.
    const titleResult = mergeField<string>(existing.title, remoteFields.title, snapshotField(snapshot, 'title'));
    const descriptionResult = mergeField<string | undefined>(
      existing.description,
      remoteFields.description,
      snapshotField(snapshot, 'description'),
    );
    // existing.status is the full Task status union; the snapshot only ever holds GitHub's
    // collapsed shape ('todo' | 'done'). Widen the merge type so both sides typecheck and let
    // mergeField compare them as plain values.
    const statusResult = mergeField<Task.Task['status']>(
      existing.status,
      remoteFields.status,
      snapshotField(snapshot, 'status'),
    );
    const writeTitle = titleResult.source === 'remote' && existing.title !== titleResult.value;
    const writeDescription = descriptionResult.source === 'remote' && existing.description !== descriptionResult.value;
    const writeStatus = statusResult.source === 'remote' && existing.status !== statusResult.value;
    Obj.update(existing, (existing) => {
      if (writeTitle) {
        existing.title = titleResult.value;
      }
      if (writeDescription) {
        existing.description = descriptionResult.value;
      }
      if (writeStatus) {
        existing.status = statusResult.value;
      }
      if (assignedPerson && !existing.assignee?.contact) {
        existing.assignee = { contact: Ref.make(assignedPerson) };
      }
      if (milestone) {
        if (existing.milestone?.target?.id !== milestone.id) {
          existing.milestone = Ref.make(milestone);
        }
        // Clear only when GitHub itself reports no milestone; a merely unresolved one would
        // otherwise wipe a perfectly good local assignment.
      } else if (issue.milestone == null && existing.milestone !== undefined) {
        existing.milestone = undefined;
      }
    });
    Cursor.writeSnapshot(binding, fid, remoteFields);
    return { task: existing, created: false };
  }

  const created = Task.make({
    [Obj.Meta]: { keys: [fkFor(issue.id)] },
    title: issue.title,
    description: issue.body ?? '',
    status: issueStateToTaskStatus(issue.state),
    assignee: assignedPerson ? { contact: Ref.make(assignedPerson) } : undefined,
    milestone: milestone ? Ref.make(milestone) : undefined,
  });
  const persisted = yield* Database.add(created);
  Cursor.writeSnapshot(binding, fid, remoteFields);
  return { task: persisted, created: true };
});

/** Scalar fields a poll writes; the coordinates name the pull request and never drift. */
const PULL_REQUEST_FIELDS = [
  'title',
  'url',
  'state',
  'author',
  'description',
  'createdAt',
  'updatedAt',
  'baseBranch',
  'headBranch',
  'headSha',
  'additions',
  'deletions',
  'checks',
  'reviewDecision',
] as const;

type PullRequestFields = Partial<Pick<PullRequest.PullRequest, (typeof PULL_REQUEST_FIELDS)[number]>>;

/** Scalar fields that differ from the stored pull request; an absent value is unknown, never a clear. */
const changedFields = (pullRequest: PullRequest.PullRequest, next: PullRequestFields): PullRequestFields => {
  const changes: PullRequestFields = {};
  const copy = <Field extends (typeof PULL_REQUEST_FIELDS)[number]>(field: Field) => {
    const value = next[field];
    if (value !== undefined && value !== pullRequest[field]) {
      changes[field] = value;
    }
  };
  PULL_REQUEST_FIELDS.forEach(copy);
  return changes;
};

const sameRefs = (left: readonly Ref.Ref<Task.Task>[] | undefined, right: readonly Ref.Ref<Task.Task>[]): boolean =>
  (left ?? []).length === right.length && right.every((ref, index) => left?.[index]?.uri === ref.uri);

/**
 * Write a pull request's delta item and GraphQL detail onto its `PullRequest`, found by its GitHub
 * id, else by coordinates (an import or a refresh made it before it was synced), else created.
 * A `Task` the earlier sync made for it is replaced (spec F-1.5). Only changed fields are written.
 */
const upsertPullRequest = Effect.fn('upsertPullRequest')(function* (
  repo: Repo.Repo,
  number: number,
  item: GitHubApi.DeltaItem | undefined,
  detail: GitHubApi.PullRequestDetail | undefined,
  existing: PullRequest.PullRequest | undefined,
) {
  const closes: Ref.Ref<Task.Task>[] = [];
  for (const reference of detail?.closingIssuesReferences?.nodes ?? []) {
    if (reference?.databaseId != null) {
      const task = yield* findByForeignId<Task.Task>(Task.Task, reference.databaseId);
      if (task) {
        closes.push(Ref.make(task));
      }
    }
  }

  const fields: PullRequestFields = {
    title: item?.title,
    url: item?.html_url ?? undefined,
    state: toPullRequestState(item, detail, existing?.state),
    author: item?.user?.login,
    description: item?.body ?? undefined,
    createdAt: item?.created_at ?? undefined,
    updatedAt: item?.updated_at ?? undefined,
    baseBranch: detail?.baseRefName,
    headBranch: detail?.headRefName,
    headSha: detail?.headRefOid,
    additions: detail?.additions,
    deletions: detail?.deletions,
    checks: detail ? toCheckState(detail) : undefined,
    reviewDecision: detail ? toReviewDecision(detail) : undefined,
  };

  if (existing) {
    const changes = changedFields(existing, fields);
    // A detail with no checks or no review decision clears the stale one, since a new commit has none yet.
    const clearChecks = detail !== undefined && fields.checks === undefined && existing.checks !== undefined;
    const clearReview =
      detail !== undefined && fields.reviewDecision === undefined && existing.reviewDecision !== undefined;
    const writeRepository = existing.repository?.target?.id !== repo.id;
    const writeCloses = detail !== undefined && !sameRefs(existing.closes, closes);
    const writeKey =
      item !== undefined && !Obj.getKeys(existing, GITHUB_SOURCE).some((key) => key.id === String(item.id));
    if (Object.keys(changes).length > 0 || clearChecks || clearReview || writeRepository || writeCloses || writeKey) {
      Obj.update(existing, (existing) => {
        Object.assign(existing, changes);
        if (clearChecks) {
          existing.checks = undefined;
        }
        if (clearReview) {
          existing.reviewDecision = undefined;
        }
        if (writeRepository) {
          existing.repository = Ref.make(repo);
        }
        if (writeCloses) {
          existing.closes = closes;
        }
        if (writeKey && item) {
          Obj.getMeta(existing).keys.push(fkFor(item.id));
        }
      });
    }
    return existing;
  }

  if (!item) {
    return undefined;
  }

  // The earlier sync mirrored pull requests as Tasks; the PullRequest replaces it under the same key.
  const legacy = yield* findByForeignId<Task.Task>(Task.Task, item.id);
  if (legacy) {
    yield* removeFromContainers(legacy);
    yield* Database.remove(legacy);
  }

  return yield* Database.add(
    PullRequest.make({
      ...fields,
      owner: repo.owner,
      repo: repo.name,
      number,
      title: item.title,
      state: fields.state ?? 'open',
      repository: Ref.make(repo),
      ...(detail && { closes }),
      [Obj.Meta]: { keys: [fkFor(item.id)] },
    }),
  );
});

/**
 * The repository's open pull requests whose checks have not settled, or every open one when `settled`:
 * a re-run moves settled checks without moving `updated_at`, so those are re-read on the hourly schedule.
 */
const queryOpenPullRequests = (repo: Repo.Repo, { settled }: { settled: boolean }) =>
  Database.query(Filter.type(PullRequest.PullRequest, { owner: repo.owner, repo: repo.name })).run.pipe(
    Effect.map((pullRequests) =>
      pullRequests.filter(
        (pullRequest) =>
          (pullRequest.state === 'open' || pullRequest.state === 'draft') &&
          (settled || pullRequest.checks === 'pending'),
      ),
    ),
  );

const findPullRequest = (repo: Repo.Repo, number: number, id: number | undefined) =>
  Effect.gen(function* () {
    const byKey =
      id === undefined ? undefined : yield* findByForeignId<PullRequest.PullRequest>(PullRequest.PullRequest, id);
    if (byKey) {
      return byKey;
    }
    const [byCoordinates] = yield* Database.query(
      Filter.type(PullRequest.PullRequest, { owner: repo.owner, repo: repo.name, number }),
    ).run;
    return byCoordinates;
  });

//
// Push (snapshot diff -> GitHub mutations)
//

export type GitHubPushResult = {
  repos: number;
  issues: number;
};

/** What a push needs to address a repository. */
export type RepoCoordinates = { id: string; owner: string; name: string };

/**
 * Push reconciler for one repo. Walks the bound `Repo` plus every Task whose
 * foreign key matches one of the issues we just pulled, diffs against the
 * binding's snapshot, and PATCHes any diverged field back to GitHub.
 *
 * Behaviour:
 *   - Repo description divergence -> PATCH /repos/{owner}/{repo}.
 *     `name` divergence is logged but NOT pushed (rename is destructive and
 *     almost never desired from a sync mirror).
 *   - Task title / description / status divergence -> PATCH the issue.
 *   - Tombstones (`Obj.isDeleted`) are skipped.
 *
 * After a successful push the snapshot is refreshed with the values just
 * sent so the next pass sees no divergence even before the next pull.
 *
 * The push callbacks' error type is generic. The reconciler doesn't inspect
 * or recover from those errors - it propagates so the outer `Effect.result`
 * at the call site can record the binding's `lastError`. Generic-`E` keeps
 * this module decoupled from the HTTP error hierarchy of `GitHubApi`.
 */
export const pushRepoUpdates: <E, R>(
  binding: Cursor.ExternalCursor,
  repo: RepoCoordinates,
  remoteIssuesById: ReadonlyMap<string, GitHubApi.GitHubIssue>,
  push: {
    /** Wraps `GitHubApi.updateIssue`. */
    updateIssue: (
      owner: string,
      repo: string,
      issueNumber: number,
      input: GitHubApi.IssueUpdateInput,
    ) => Effect.Effect<void, E, R>;
    /** Wraps `GitHubApi.updateRepo`. */
    updateRepo: (owner: string, repo: string, input: GitHubApi.RepoUpdateInput) => Effect.Effect<void, E, R>;
  },
) => Effect.Effect<GitHubPushResult, E, Database.Service | R> = Effect.fn('pushRepoUpdates')(
  function* (binding, repo, remoteIssuesById, push) {
    let repos = 0;
    let issues = 0;

    // Repo push - description only.
    {
      const fid = repo.id;
      const local = yield* findByForeignId<Repo.Repo>(Repo.Repo, repo.id);
      if (local && !Obj.isDeleted(local)) {
        const snapshot = Cursor.readSnapshot<RepoSnapshot>(binding, fid);
        if (snapshot) {
          const localName = local.name ?? '';
          const localDescription = local.description ?? '';
          const input: GitHubApi.RepoUpdateInput = {};
          let diverged = false;
          if (snapshot.description !== undefined && snapshot.description !== localDescription) {
            input.description = localDescription;
            diverged = true;
          }
          if (snapshot.name !== undefined && snapshot.name !== localName) {
            // We deliberately don't push repo renames - see updateRepo above.
            // Log instead so the user can chase down via the audit channel.
            log.warn('github push: local repo name diverges from remote; rename push is intentionally disabled', {
              repoId: fid,
              localName,
              snapshotName: snapshot.name,
            });
          }
          if (diverged) {
            yield* push.updateRepo(repo.owner, repo.name, input);
            Cursor.writeSnapshot(binding, fid, {
              ...snapshot,
              description: localDescription,
            });
            repos++;
          }
        }
      }
    }

    // Task (issue) push - title / body / state.
    for (const [id, remoteIssue] of remoteIssuesById) {
      const local = yield* findByForeignId<Task.Task>(Task.Task, id);
      if (!local || Obj.isDeleted(local)) {
        continue;
      }
      const snapshot = Cursor.readSnapshot<TaskSnapshot>(binding, id);
      if (!snapshot) {
        continue;
      }
      const localTitle = local.title ?? '';
      const localDescription = local.description ?? '';
      const localStatus = local.status;
      const desiredStatusForSnapshot: 'todo' | 'done' | undefined =
        localStatus === 'done' ? 'done' : localStatus === 'todo' || localStatus === 'started' ? 'todo' : undefined;

      const input: GitHubApi.IssueUpdateInput = {};
      let diverged = false;
      if (snapshot.title !== undefined && snapshot.title !== localTitle) {
        input.title = localTitle;
        diverged = true;
      }
      if (snapshot.description !== undefined && snapshot.description !== localDescription) {
        input.body = localDescription;
        diverged = true;
      }
      // Status push is pull-only for PRs. GitHub uses the same /issues/{n}
      // endpoint for issues and PRs, but `state: 'closed'` on a PR rejects
      // it (the closed-without-merge red badge), and merging requires a
      // separate `PUT /pulls/{n}/merge` endpoint we don't support. The safe
      // default is to never push a status change for a PR - log if local
      // and snapshot diverge so the divergence is auditable.
      const isPullRequest = remoteIssue.pull_request != null;
      if (
        !isPullRequest &&
        snapshot.status !== undefined &&
        desiredStatusForSnapshot !== undefined &&
        snapshot.status !== desiredStatusForSnapshot
      ) {
        const issueState = taskStatusToIssueState(localStatus);
        if (issueState) {
          input.state = issueState;
          diverged = true;
        }
      } else if (
        isPullRequest &&
        snapshot.status !== undefined &&
        desiredStatusForSnapshot !== undefined &&
        snapshot.status !== desiredStatusForSnapshot
      ) {
        log.warn('github push: PR status diverged locally; pull-only for PRs (status will not be pushed)', {
          issueId: id,
          number: remoteIssue.number,
          localStatus,
          snapshotStatus: snapshot.status,
        });
      }
      if (!diverged) {
        continue;
      }

      yield* push.updateIssue(repo.owner, repo.name, remoteIssue.number, input);
      // Refresh the snapshot: title / description / status sent. Status only
      // gets refreshed when we actually pushed a state change (issues only) -
      // for PRs we keep the snapshot's previous status, so the warning above
      // keeps firing until either the user reverts locally or the PR's state
      // changes on GitHub and a pull catches up.
      Cursor.writeSnapshot(binding, id, {
        ...snapshot,
        title: localTitle,
        description: localDescription,
        status: input.state !== undefined ? (desiredStatusForSnapshot ?? snapshot.status) : snapshot.status,
      });
      issues++;
    }

    return { repos, issues };
  },
);

//
// Main handler
//

/** Epoch milliseconds of the newest `updated_at` among `items`; `-Infinity` when none carries one. */
const newestUpdate = (items: readonly GitHubApi.DeltaItem[]): number =>
  Math.max(
    ...items.map((item) => (item.updated_at ? Date.parse(item.updated_at) : Number.NaN)).filter(Number.isFinite),
  );

/** One binding's poll, as reported in {@link GitHubOperation.SyncResult}. */
type BindingSyncResult = {
  /** The delta answered 304. */
  notModified: boolean;
  /** GitHub requests made. */
  requests: number;
  pulled: { issues: number; pullRequests: number };
  pushed: GitHubPushResult;
};

/**
 * The `Repo` a binding targets. A binding made before bindings targeted a `Repo` targets its issue
 * `TaskSet`; that one is pointed at the `Repo` once, found among the repositories the token reaches.
 */
const resolveBoundRepo = Effect.fn('resolveBoundRepo')(function* (
  binding: Cursor.ExternalCursor,
  target: Obj.Unknown,
  externalId: string,
) {
  if (Repo.instanceOf(target)) {
    return { repo: target, requests: 0 };
  }
  const reachable = yield* GitHubApi.fetchReachableRepos();
  const remote = reachable.find((candidate) => String(candidate.id) === externalId);
  if (!remote) {
    return yield* Effect.fail(new GitHubRepoInaccessibleError());
  }
  const repo = yield* ensureRepo(toRepoDescriptor(remote));
  Obj.update(binding, (binding) => {
    if (binding.spec.kind === 'external') {
      binding.spec.target = Ref.make(repo);
    }
  });
  return { repo, requests: 1 };
});

/**
 * Re-read the repository (hourly) and its organization (daily). Neither is part of the one-request
 * quiet poll: each is due only once its interval has passed since the time recorded in the
 * repository's snapshot.
 */
const readRepoMetadata = Effect.fn('readRepoMetadata')(function* (
  binding: Cursor.ExternalCursor,
  repo: Repo.Repo,
  externalId: string,
  issueSet: TaskSet.TaskSet,
  ensurePerson: (
    user: GitHubApi.GitHubUser,
    organization: Organization.Organization | undefined,
  ) => Effect.Effect<Person.Person, unknown, Database.Service>,
  now: number,
) {
  let requests = 0;
  const snapshot = Cursor.readSnapshot<RepoSnapshot>(binding, externalId);

  const hourly = snapshot?.readAt === undefined || now - snapshot.readAt >= REPO_READ_INTERVAL_MS;
  // A pending local description edit is merged against a fresh read, or the push could overwrite a newer GitHub edit.
  const localEdit = snapshot?.description !== undefined && snapshot.description !== (repo.description ?? '');
  if (hourly || localEdit) {
    const result = yield* GitHubApi.fetchRepoConditional(repo.owner, repo.name, snapshot?.etag).pipe(
      Effect.catchIf(
        (error) => {
          const status = GitHubApi.responseStatus(error);
          return status === 403 || status === 404;
        },
        () => Effect.fail(new GitHubRepoInaccessibleError({ context: { owner: repo.owner, name: repo.name } })),
      ),
    );
    requests++;
    if (result.status === 'ok') {
      // Coordinates that now name a different repository (a rename freed the name) bind to nothing.
      if (String(result.value.id) !== externalId) {
        return yield* Effect.fail(new GitHubRepoInaccessibleError({ context: { owner: repo.owner, name: repo.name } }));
      }
      yield* upsertRepo(binding, repo, result.value, { etag: result.etag, readAt: now });
    } else if (snapshot) {
      Cursor.writeSnapshot(binding, externalId, { ...snapshot, readAt: now });
    }
  }
  // Read on every hourly read, since a milestone change does not move the repository's ETag; the delta
  // carries only the milestones its issues name.
  if (hourly) {
    const milestones = yield* GitHubApi.fetchRepoMilestones(repo.owner, repo.name);
    requests++;
    for (const milestone of milestones) {
      yield* upsertMilestone(issueSet, milestone);
    }
  }

  const current = Cursor.readSnapshot<RepoSnapshot>(binding, externalId);
  if (current && (current.membersReadAt === undefined || now - current.membersReadAt >= MEMBERS_READ_INTERVAL_MS)) {
    const org = yield* Effect.result(GitHubApi.fetchOrg(repo.owner));
    requests++;
    // `/orgs/{owner}` answers 404 for a user-owned repository; any other failure is retried next poll.
    const notAnOrg = org._tag === 'Failure' && GitHubApi.responseStatus(org.failure) === 404;
    if (org._tag === 'Failure' && !notAnOrg) {
      log.warn('github sync: organization read failed; retrying next poll', { owner: repo.owner, error: org.failure });
      return { requests, hourly };
    }
    if (org._tag === 'Success') {
      const organization = yield* upsertOrganization(org.success);
      if (!repo.organization) {
        Obj.update(repo, (repo) => {
          repo.organization = Ref.make(organization);
        });
      }
      const members = yield* GitHubApi.fetchOrgMembers(repo.owner);
      requests++;
      for (const member of members) {
        yield* ensurePerson(member, organization);
      }
    } else {
      log.info('github sync: owner is not an org, skipping org/member pull', { owner: repo.owner });
    }
    Cursor.writeSnapshot(binding, externalId, { ...current, membersReadAt: now });
  }

  return { requests, hourly };
});

/**
 * One poll of one binding (spec/SYNC.mdl F-2): the delta, the pull-request batch, the three-way
 * merge and push for issues, then the cursor advance. Stamps success or failure onto the binding.
 */
export const syncRepoBinding = Effect.fn('syncRepoBinding')(function* (binding: Cursor.ExternalCursor) {
  const target = yield* Database.load(binding.spec.target);
  const db = Obj.getDatabase(binding) ?? Obj.getDatabase(target);
  if (!db) {
    return yield* Effect.fail(new ConnectorSync.DatabaseMissingError());
  }

  // The repo's foreign id: prefer the binding's `externalId`, falling back to the GitHub foreign key on the target.
  const externalId =
    binding.spec.externalId ?? Obj.getMeta(target).keys.find((key) => key.source === GITHUB_SOURCE)?.id;

  const outcome = yield* Effect.result(
    Progress.withReporter(
      { key: Progress.createSyncKey(target), label: `Syncing ${Obj.getLabel(target) ?? 'repository'}` },
      (reporter) =>
        Effect.gen(function* () {
          if (externalId === undefined) {
            return yield* Effect.fail(new GitHubRepoUnresolvedError());
          }
          const now = yield* Clock.currentTimeMillis;
          let requests = 0;

          const resolved = yield* resolveBoundRepo(binding, target, externalId);
          const repo = resolved.repo;
          requests += resolved.requests;
          const issueSet = yield* ensureIssueSet(repo, externalId);

          // Cross-issue dedup for Person upserts: parallel per-issue work can race two upserts for the
          // same login. The semaphore + cache pair gives a single in-flight upsert per login.
          const personByLogin = new Map<string, Person.Person>();
          const personSemaphore = yield* Semaphore.make(1);
          const ensurePerson = (user: GitHubApi.GitHubUser, organization: Organization.Organization | undefined) =>
            personSemaphore.withPermits(1)(
              Effect.gen(function* () {
                const cached = personByLogin.get(user.login);
                if (cached) {
                  return cached;
                }
                const person = yield* upsertPerson(user, organization);
                personByLogin.set(user.login, person);
                return person;
              }),
            );

          const metadata = yield* readRepoMetadata(binding, repo, externalId, issueSet, ensurePerson, now);
          requests += metadata.requests;

          // The delta: one request when nothing changed. Until a complete read has stored an ETag, the
          // binding backfills oldest first in capped chunks, each advancing the watermark. The ETag only
          // describes the URL the watermark built, so it is sent only alongside one.
          const options = (binding.spec.options ?? undefined) as GitHubOperation.SyncOptions | undefined;
          const since = binding.max
            ? new Date(Cursor.parseKey(binding.max)).toISOString()
            : sinceFromOptions(options, now);
          const etag = binding.max ? Cursor.readToken(binding) : undefined;
          let delta = yield* GitHubApi.listIssuesSince(
            repo.owner,
            repo.name,
            etag ? { since, etag } : { since, direction: 'asc', maxPages: BACKFILL_PAGES },
          );
          requests += delta.status === 'ok' ? delta.requests : 1;
          // A capped chunk whose items all fall within the overlap of the watermark (more than ten pages
          // updated in the same few seconds) cannot advance it, so that backlog is read to its end at once.
          if (
            delta.status === 'ok' &&
            delta.truncated &&
            newestUpdate(delta.value) - WATERMARK_OVERLAP_MS <= Cursor.parseKey(binding.max)
          ) {
            delta = yield* GitHubApi.listIssuesSince(repo.owner, repo.name, { since, direction: 'asc' });
            requests += delta.status === 'ok' ? delta.requests : 1;
          }
          const items = delta.status === 'ok' ? delta.value : [];
          const issueItems = items.filter((item) => item.pull_request == null);
          const pullItems = items.filter((item) => item.pull_request != null);

          // Check results do not move `updated_at`, so pending pull requests join every batch until they settle.
          const deltaNumbers = new Set(pullItems.map((item) => item.number));
          const pending = (yield* queryOpenPullRequests(repo, { settled: metadata.hourly })).filter(
            (pullRequest) => !deltaNumbers.has(pullRequest.number),
          );
          const pushCallbacks = {
            updateIssue: (owner: string, repoName: string, issueNumber: number, input: GitHubApi.IssueUpdateInput) =>
              GitHubApi.updateIssue(owner, repoName, issueNumber, input).pipe(Effect.asVoid),
            updateRepo: (owner: string, repoName: string, input: GitHubApi.RepoUpdateInput) =>
              GitHubApi.updateRepo(owner, repoName, input).pipe(Effect.asVoid),
          };
          const coordinates = { id: externalId, owner: repo.owner, name: repo.name };

          if (delta.status === 'not-modified' && pending.length === 0) {
            // A local repository edit is pushed even when GitHub reports nothing new; it costs no request unless diverged.
            const pushed = yield* pushRepoUpdates(binding, coordinates, new Map(), pushCallbacks);
            requests += pushed.repos;
            return {
              result: { notModified: true, requests, pulled: { issues: 0, pullRequests: 0 }, pushed },
              watermark: undefined,
            };
          }

          reporter.total(items.length + pending.length);

          // Issues: milestones they name first, so each resolves to a local mirror.
          const milestoneByRemoteId = new Map<number, Milestone.Milestone>();
          for (const item of issueItems) {
            if (item.milestone && !milestoneByRemoteId.has(item.milestone.id)) {
              milestoneByRemoteId.set(item.milestone.id, yield* upsertMilestone(issueSet, item.milestone));
            }
          }
          const remoteIssuesById = new Map<string, GitHubApi.GitHubIssue>();
          const pulledTasks = yield* Effect.forEach(
            issueItems,
            (issue) =>
              Effect.gen(function* () {
                // First assignee only; the semaphored `ensurePerson` dedups across fibers.
                const assigneeUser = issue.assignees?.[0];
                const assignedPerson = assigneeUser ? yield* ensurePerson(assigneeUser, undefined) : undefined;
                const milestone = issue.milestone ? milestoneByRemoteId.get(issue.milestone.id) : undefined;
                const { task } = yield* upsertTask(binding, issue, assignedPerson, milestone);
                remoteIssuesById.set(String(issue.id), issue);
                reporter.advance();
                return task;
              }),
            { concurrency: ISSUE_CONCURRENCY },
          );
          // Sequential: `TaskSet.tasks` is one shared array, so concurrent appends would drop entries.
          for (const task of pulledTasks) {
            yield* setTaskContainer(task, issueSet);
          }

          // Pull requests: one GraphQL request per batch, after the issues, so `closes` resolves them.
          const numbers = [
            ...pullItems.map((item) => item.number),
            ...pending.map((pullRequest) => pullRequest.number),
          ];
          const details = new Map<number, GitHubApi.PullRequestDetail>();
          for (let offset = 0; offset < numbers.length; offset += GitHubApi.PULL_REQUEST_BATCH_SIZE) {
            const batch = numbers.slice(offset, offset + GitHubApi.PULL_REQUEST_BATCH_SIZE);
            for (const detail of yield* GitHubApi.fetchPullRequestDetails(repo.owner, repo.name, batch)) {
              details.set(detail.number, detail);
            }
            requests++;
          }
          for (const item of pullItems) {
            const existing = yield* findPullRequest(repo, item.number, item.id);
            yield* upsertPullRequest(repo, item.number, item, details.get(item.number), existing);
            reporter.advance();
          }
          for (const pullRequest of pending) {
            yield* upsertPullRequest(repo, pullRequest.number, undefined, details.get(pullRequest.number), pullRequest);
            reporter.advance();
          }

          // Push: snapshot-diff the bound Repo and the pulled issues, PATCHing only diverged fields.
          // TODO(wittjosiah): the candidate set is this poll's delta, so a local edit to an issue
          //   GitHub has not touched since is pushed only once GitHub next reports it.
          const pushed = yield* pushRepoUpdates(binding, coordinates, remoteIssuesById, pushCallbacks);
          requests += pushed.issues + pushed.repos;

          // The watermark moves only once every page is applied, and never backwards.
          const newest = newestUpdate(items);
          // A truncated backfill stores no ETag, so the next run continues oldest first from the watermark.
          const truncated = delta.status === 'ok' && delta.truncated === true;
          const watermark =
            delta.status === 'ok'
              ? {
                  max: Number.isFinite(newest)
                    ? Cursor.formatKey(Math.max(newest - WATERMARK_OVERLAP_MS, Cursor.parseKey(binding.max)))
                    : undefined,
                  etag: truncated ? undefined : delta.etag,
                  truncated,
                }
              : undefined;

          return {
            result: {
              notModified: delta.status === 'not-modified',
              requests,
              pulled: { issues: issueItems.length, pullRequests: pullItems.length + pending.length },
              pushed,
            },
            watermark,
          };
        }).pipe(Effect.provide(Layer.provideMerge(Database.layer(db), GitHubApi.fromAccessToken(binding.spec.source)))),
    ),
  );

  // Write sync state onto the binding.
  if (outcome._tag === 'Success') {
    const { result, watermark } = outcome.success;
    if (watermark?.etag !== undefined) {
      Cursor.writeToken(binding, watermark.etag);
    }
    Cursor.advance(binding, watermark?.max);
    if (watermark?.truncated) {
      // The backlog is not read to its end: the dispatcher re-runs the sync, which resumes from the watermark.
      return yield* Operation.runAgain().pipe(Effect.orDie);
    }
    if (!result.notModified) {
      yield* Effect.ignore(
        Operation.invoke(LayoutOperation.AddToast, {
          id: `${GitHubNamespace.key}.sync-success`,
          icon: 'ph--check--regular',
          title: ['sync-toast.success.label', { ns: GitHubNamespace.key }],
        }),
      );
    }
    return result;
  } else {
    const message = formatGitHubSyncFailure(outcome.failure);
    Cursor.recordError(binding, message);
    log.warn('github sync: binding failed', { error: outcome.failure });
    yield* Effect.ignore(
      Operation.invoke(LayoutOperation.AddToast, {
        id: `${GitHubNamespace.key}.sync-error`,
        icon: 'ph--warning--regular',
        title: ['sync-toast.error.label', { ns: GitHubNamespace.key }],
        description: message,
      }),
    );
    return yield* Effect.fail(outcome.failure);
  }
}, Effect.provide(FetchHttpClient.layer));

type BindingOutcome =
  | { readonly kind: 'items'; readonly items: BindingSyncResult }
  | { readonly kind: 'files'; readonly files: FileSyncResult };

/** Folds per-binding results into the operation's {@link GitHubOperation.SyncResult}. */
const foldResults = (outcomes: readonly BindingOutcome[]): GitHubOperation.SyncResult => {
  const results = outcomes.flatMap((outcome) => (outcome.kind === 'items' ? [outcome.items] : []));
  const files = outcomes.flatMap((outcome) => (outcome.kind === 'files' ? [outcome.files] : []));
  return {
    bindings: outcomes.length,
    notModified: results.filter((result) => result.notModified).length,
    requests:
      results.reduce((total, result) => total + result.requests, 0) +
      files.reduce((total, result) => total + result.requests, 0),
    pulled: {
      issues: results.reduce((total, result) => total + result.pulled.issues, 0),
      pullRequests: results.reduce((total, result) => total + result.pulled.pullRequests, 0),
    },
    pushed: {
      issues: results.reduce((total, result) => total + result.pushed.issues, 0),
      repos: results.reduce((total, result) => total + result.pushed.repos, 0),
    },
    ...(files.length > 0
      ? {
          files: {
            pulled: files.reduce((total, result) => total + result.pulled, 0),
            pushed: files.reduce((total, result) => total + result.pushed, 0),
            skipped: files.reduce((total, result) => total + result.skipped.length, 0),
          },
        }
      : {}),
  };
};

const handler: Operation.WithHandler<typeof GitHubOperation.SyncGitHubRepositories> =
  GitHubOperation.SyncGitHubRepositories.pipe(
    Operation.withHandler(({ connection, priority }) =>
      Effect.gen(function* () {
        const mappings = yield* Capability.getAll(GitHubCapabilities.FileMapping);
        const { outputs } = yield* Binding.syncAll({
          connection,
          priority,
          // A repository's file binding shares its target with the item binding; `options.stream` tells them apart.
          sync: (binding) =>
            Effect.gen(function* () {
              const outcome: BindingOutcome = isFileBinding(binding)
                ? { kind: 'files', files: yield* syncFileBinding(binding, mappings) }
                : { kind: 'items', items: yield* syncRepoBinding(binding) };
              return outcome;
            }),
        });
        return foldResults(outputs);
      }),
    ),
  );

export default handler;
