//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { LayoutOperation, mergeField, readSnapshot, snapshotField, writeSnapshot } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { Organization, Person, Project, Task } from '@dxos/types';

import { meta } from '#meta';

import { GITHUB_SOURCE } from '../constants';
import { formatGitHubSyncFailure } from '../errors';
import { GitHubApi } from '../services';
import { GitHubOperation } from '../types';

//
// Direction: bidirectional (pull-then-push) for projects and tasks.
//
// Each sync pass first pulls every reachable Organization, Person, Project,
// and Task from GitHub into ECHO, then walks the local mirrors and pushes
// any field that diverged from the snapshot taken at the end of the previous
// pull. Snapshots live on `Integration.snapshots[<github id>]` (where ids
// are the GitHub-issued numeric ids, stringified for stable foreign-key
// matching).
//
// Mapped fields per object:
//   Project (repo): description (description-only — see updateRepo for why
//                   `name` is intentionally not pushed)
//   Task (issue):   title, description, status (open/closed)
//
// Conflict policy is remote-wins (mirrors Trello/Linear). Comments are NOT
// synced (the chunked-yield rewrite is still pending; see TODO below).
//
// Attribution caveat: pushed edits are attributed to the GitHub App / OAuth
// user that owns the integration token, not to the local user who made the
// edit. This is unavoidable with the current token model — a write from
// "Person A in space" appears on GitHub as a write from the App. Document
// before enabling for shared spaces.
//
// New local objects (no GitHub foreign key) are NOT pushed in this pass —
// creating a new GitHub issue requires (owner, repo) which we currently
// don't surface from local Tasks unambiguously.
//
// Sync target shape: the user picks REPOSITORIES. The repos' owning orgs
// (and org members) are auto-pulled — a single Organization per unique owner
// across the selected repos, deduped within one sync pass. The user does
// not pick orgs directly.
//

//
// Tunables
//

/** Per-target parallelism across selected repos. */
const REPO_CONCURRENCY = 4;
const ISSUE_CONCURRENCY = 4;

//
// Snapshot field shapes (stored on `Integration.snapshots`)
//

/**
 * Snapshot shapes. Fields are required (not `?`) because every snapshot is
 * written in one shot via {@link writeSnapshot} after a pull; absence-of-
 * snapshot is modeled by `readSnapshot` returning `undefined`. `name` on a
 * Project is recorded but not pushed — see {@link GitHubApi.updateRepo}.
 */
type ProjectSnapshot = {
  name: string;
  description: string;
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
 * untyped — the caller supplies the result type via the explicit `T` parameter
 * (mirrors how plugin-trello casts after `Database.runQuery`).
 */
const findByForeignId = <T>(type: Type.AnyEntity, id: string | number) =>
  Effect.gen(function* () {
    const results = yield* Database.runQuery(Query.select(Filter.foreignKeys(type as never, [fkFor(id)])));
    return results.length > 0 ? (results[0] as T) : undefined;
  });

//
// Field mappers (GitHub ↔ DXOS)
//

/**
 * Maps GitHub issue state to a Task status. GitHub issues only have `open` /
 * `closed` — there's no "in progress" concept, so we collapse open→`todo` and
 * closed→`done`. PRs use the same mapping; merged PRs are reported as `closed`
 * by GitHub plus a non-null `pull_request.merged_at`.
 */
const issueStateToTaskStatus = (state: string): 'todo' | 'done' => (state === 'closed' ? 'done' : 'todo');

/**
 * Reverse of {@link issueStateToTaskStatus}. `'in-progress'` is collapsed to
 * `open` since GitHub has no equivalent state. Returns undefined when the
 * status is unrecognised so the caller can skip the push instead of failing.
 */
const taskStatusToIssueState = (status: string | undefined): 'open' | 'closed' | undefined => {
  switch (status) {
    case 'done':
      return 'closed';
    case 'todo':
    case 'in-progress':
      return 'open';
    default:
      return undefined;
  }
};

const sinceFromOptions = (options: GitHubOperation.SyncOptions | undefined): string | undefined => {
  const days = options?.maxDaysBack;
  if (typeof days !== 'number' || days <= 0) {
    return undefined;
  }
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
};

//
// Pull (snapshot-driven three-way merge for Project + Task; simple upsert for Org/Person)
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
        existing.identities = [...ids, { label: 'github', value: user.login }];
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
 * Pull a GitHub repo into ECHO as a Project. Mapped fields go through
 * three-way merge against `integration.snapshots[<repo id>]`; the snapshot
 * is then refreshed to remote-current so the next push pass sees only
 * fields the user has edited locally. `name` is recorded in the snapshot
 * (so we can detect divergence) but is not pushed back — see
 * {@link GitHubApi.updateRepo}.
 */
const upsertProject = Effect.fn('upsertProject')(function* (
  integration: Obj.Unknown & { snapshots?: Record<string, unknown> },
  repo: GitHubApi.GitHubRepo,
) {
  const remoteFields: Required<ProjectSnapshot> = {
    name: repo.full_name,
    description: repo.description ?? '',
  };
  const fid = String(repo.id);
  const existing = yield* findByForeignId<Project.Project>(Project.Project, repo.id);

  if (existing) {
    const snapshot = readSnapshot<ProjectSnapshot>(integration, fid);
    const nameResult = mergeField<string | undefined>(
      existing.name,
      remoteFields.name,
      snapshotField(snapshot, 'name'),
    );
    const descriptionResult = mergeField<string | undefined>(
      existing.description,
      remoteFields.description,
      snapshotField(snapshot, 'description'),
    );
    const writeName = nameResult.source === 'remote' && existing.name !== nameResult.value;
    const writeDescription = descriptionResult.source === 'remote' && existing.description !== descriptionResult.value;
    if (writeName || writeDescription) {
      Obj.update(existing, (existing) => {
        if (writeName) {
          existing.name = nameResult.value;
        }
        if (writeDescription) {
          existing.description = descriptionResult.value;
        }
      });
    }
    writeSnapshot(integration, fid, remoteFields);
    return existing;
  }

  const created = Obj.make(Project.Project, {
    [Obj.Meta]: { keys: [fkFor(repo.id)] },
    name: repo.full_name,
    description: repo.description ?? undefined,
  });
  const persisted = yield* Database.add(created);
  writeSnapshot(integration, fid, remoteFields);
  return persisted;
});

/**
 * Pull a GitHub issue into ECHO as a Task. Same merge shape as
 * {@link upsertProject}, against snapshot fields {title, description, status}.
 * Non-mapped fields (`Task.priority`, `Task.estimate`, etc.) are preserved.
 */
const upsertTask = Effect.fn('upsertTask')(function* (
  integration: Obj.Unknown & { snapshots?: Record<string, unknown> },
  issue: GitHubApi.GitHubIssue,
  assignedPerson: Person.Person | undefined,
  project: Project.Project,
) {
  const remoteFields: Required<TaskSnapshot> = {
    title: issue.title,
    description: issue.body ?? '',
    status: issueStateToTaskStatus(issue.state),
  };
  const fid = String(issue.id);
  const existing = yield* findByForeignId<Task.Task>(Task.Task, issue.id);

  if (existing) {
    const snapshot = readSnapshot<TaskSnapshot>(integration, fid);
    // Task.title is required (non-optional) so the merge produces a string.
    const titleResult = mergeField<string>(existing.title, remoteFields.title, snapshotField(snapshot, 'title'));
    const descriptionResult = mergeField<string | undefined>(
      existing.description,
      remoteFields.description,
      snapshotField(snapshot, 'description'),
    );
    // existing.status is the full Task status union ('todo' | 'in-progress' | 'done' | undefined);
    // the snapshot only ever holds GitHub's collapsed shape ('todo' | 'done'). Widen the merge
    // type so both sides typecheck and let mergeField compare them as plain values.
    const statusResult = mergeField<'todo' | 'in-progress' | 'done' | undefined>(
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
      if (assignedPerson && !existing.assigned) {
        existing.assigned = Ref.make(assignedPerson);
      }
      const currentProjectId = existing.project ? EID.getEntityId(EID.tryParse(existing.project.uri)!) : undefined;
      const projectId = EID.getEntityId(EID.tryParse(Ref.make(project).uri)!);
      if (!existing.project || (currentProjectId && projectId && currentProjectId !== projectId)) {
        existing.project = Ref.make(project);
      }
    });
    writeSnapshot(integration, fid, remoteFields);
    return { task: existing, created: false };
  }

  const created = Task.make({
    [Obj.Meta]: { keys: [fkFor(issue.id)] },
    title: issue.title,
    description: issue.body ?? '',
    status: issueStateToTaskStatus(issue.state),
    assigned: assignedPerson ? Ref.make(assignedPerson) : undefined,
    project: Ref.make(project),
  });
  const persisted = yield* Database.add(created);
  writeSnapshot(integration, fid, remoteFields);
  return { task: persisted, created: true };
});

//
// Push (snapshot diff → GitHub mutations)
//

export type GitHubPushResult = {
  projects: number;
  tasks: number;
};

/**
 * Push reconciler for one repo. Walks the locally-mirrored Project for the
 * given repo plus every Task whose foreign key matches one of the issues we
 * just pulled, diffs against the snapshot, and PATCHes any diverged field
 * back to GitHub.
 *
 * Behaviour:
 *   - Project description divergence → PATCH /repos/{owner}/{repo}.
 *     `name` divergence is logged but NOT pushed (rename is destructive and
 *     almost never desired from a sync mirror).
 *   - Task title / description / status divergence → PATCH the issue.
 *   - Tombstones (`Obj.isDeleted`) are skipped.
 *
 * After a successful push the snapshot is refreshed with the values just
 * sent so the next pass sees no divergence even before the next pull.
 *
 * The push callbacks' error type is generic. The reconciler doesn't inspect
 * or recover from those errors — it propagates so the outer `Effect.either`
 * at the call site can record a per-target `lastError`. Generic-`E` keeps
 * this module decoupled from the HTTP error hierarchy of `GitHubApi`.
 */
export const pushRepoUpdates: <E, R>(
  integration: Obj.Unknown & { snapshots?: Record<string, unknown> },
  repo: GitHubApi.GitHubRepo,
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
  function* (integration, repo, remoteIssuesById, push) {
    let projects = 0;
    let tasks = 0;

    // Project (repo) push — description only.
    {
      const fid = String(repo.id);
      const local = yield* findByForeignId<Project.Project>(Project.Project, repo.id);
      if (local && !Obj.isDeleted(local)) {
        const snapshot = readSnapshot<ProjectSnapshot>(integration, fid);
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
            // We deliberately don't push repo renames — see updateRepo above.
            // Log instead so the user can chase down via the audit channel.
            log.warn('github push: local repo name diverges from remote; rename push is intentionally disabled', {
              repoId: fid,
              localName,
              snapshotName: snapshot.name,
            });
          }
          if (diverged) {
            yield* push.updateRepo(repo.owner.login, repo.name, input);
            writeSnapshot(integration, fid, {
              ...snapshot,
              description: localDescription,
            });
            projects++;
          }
        }
      }
    }

    // Task (issue) push — title / body / state.
    for (const [id, remoteIssue] of remoteIssuesById) {
      const local = yield* findByForeignId<Task.Task>(Task.Task, id);
      if (!local || Obj.isDeleted(local)) {
        continue;
      }
      const snapshot = readSnapshot<TaskSnapshot>(integration, id);
      if (!snapshot) {
        continue;
      }
      const localTitle = local.title ?? '';
      const localDescription = local.description ?? '';
      const localStatus = local.status;
      const desiredStatusForSnapshot: 'todo' | 'done' | undefined =
        localStatus === 'done' ? 'done' : localStatus === 'todo' || localStatus === 'in-progress' ? 'todo' : undefined;

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
      // default is to never push a status change for a PR — log if local
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

      yield* push.updateIssue(repo.owner.login, repo.name, remoteIssue.number, input);
      // Refresh the snapshot: title / description / status sent. Status only
      // gets refreshed when we actually pushed a state change (issues only) —
      // for PRs we keep the snapshot's previous status, so the warning above
      // keeps firing until either the user reverts locally or the PR's state
      // changes on GitHub and a pull catches up.
      writeSnapshot(integration, id, {
        ...snapshot,
        title: localTitle,
        description: localDescription,
        status: input.state !== undefined ? (desiredStatusForSnapshot ?? snapshot.status) : snapshot.status,
      });
      tasks++;
    }

    return { projects, tasks };
  },
);

//
// Main handler
//

const handler: Operation.WithHandler<typeof GitHubOperation.SyncGitHubRepositories> =
  GitHubOperation.SyncGitHubRepositories.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ integration, repository: repoRef }) {
        // TODO(wittjosiah): The operation should depend on `Database.Service` once
        //   the OperationInvoker has a `databaseResolver`. Until then we require
        //   the caller to preload `integration.target` so we can derive the db.
        const integrationTarget = integration.target;
        const db = integrationTarget ? Obj.getDatabase(integrationTarget) : undefined;
        if (!db) {
          return yield* Effect.dieMessage('Integration ref must be preloaded by caller (no database derivable).');
        }

        const integrationId = EID.getEntityId(EID.tryParse(integration.uri)!) ?? 'unknown';
        const toastIdSuffix = repoRef
          ? `${integrationId}.${EID.getEntityId(EID.tryParse(repoRef.uri)!) ?? 'unknown'}`
          : integrationId;

        const outcome = yield* Effect.either(
          Effect.gen(function* () {
            const integrationObj = yield* Database.load(integration);

            // Fetch all repos visible to the token once so each target row can
            // resolve its remote `GitHubRepo`. Targets store the numeric repo id
            // as `remoteId` (a stringified integer).
            // TODO(wittjosiah): Switch to per-target `fetchRepo(owner, name)` once
            //   targets carry `owner`/`name` in metadata. `fetchUserRepos()` walks
            //   every repo the token can see and dominates large-account syncs.
            const allRepos = yield* GitHubApi.fetchUserRepos();
            const reposById = new Map(allRepos.map((repo) => [String(repo.id), repo]));

            // Optional narrow filter to a single Project echo id.
            const repoFilterId = repoRef ? EID.getEntityId(EID.tryParse(repoRef.uri)!) : undefined;

            // Materialize per-target work: ensure local Project exists, wire
            // `target.object` ref, then later batch-pull each repo's owning org
            // (deduped) and the repo's issues+PRs+comments.
            type TargetEntry = {
              entry: (typeof integrationObj.targets)[number];
              project: Project.Project;
              remoteRepo: GitHubApi.GitHubRepo;
              remoteId: string;
              options: GitHubOperation.SyncOptions | undefined;
              /** Set when `target.object` needs to be (re)pointed at `project`. */
              rewireRef: Ref.Ref<Project.Project> | undefined;
            };
            const targetEntries: TargetEntry[] = [];
            /** Targets with a foreignId the integration token can't resolve — surfaced via lastError. */
            const inaccessibleRemoteIds: string[] = [];
            for (const target of integrationObj.targets) {
              let foreignId = target.remoteId;
              const localObj = target.object?.target;
              if (foreignId === undefined && localObj) {
                foreignId = Obj.getMeta(localObj).keys.find((k) => k.source === GITHUB_SOURCE)?.id;
              }
              if (foreignId === undefined) {
                continue;
              }
              const remoteRepo = reposById.get(foreignId);
              if (!remoteRepo) {
                inaccessibleRemoteIds.push(foreignId);
                continue;
              }

              // Project echo id for the filter is only available after upsert;
              // when filtering to a single repo, resolve the existing local
              // Project (if any) first and bail out before upsertProject's
              // pull/merge side effects on unrelated repos.
              if (repoFilterId) {
                const existing = yield* findByForeignId<Project.Project>(Project.Project, remoteRepo.id);
                if (!existing || existing.id !== repoFilterId) {
                  continue;
                }
              }

              // Always upsert by foreign-key. If `target.object` is already pointing
              // at the same Project (the normal round-trip), the upsert finds it,
              // refreshes its fields, and returns the same instance — and we leave
              // `target.object` alone. If `target.object` was missing or pointed at
              // a different object, the upsert may have created a new Project (or
              // resolved an unrelated one); rewire `target.object` to whatever the
              // upsert returned so the user-visible target tracks the actual record.
              const project = yield* upsertProject(integrationObj, remoteRepo);
              const rewireRef = !localObj || localObj.id !== project.id ? Ref.make(project) : undefined;

              targetEntries.push({
                entry: target,
                project,
                remoteRepo,
                remoteId: foreignId,
                options: (target.options ?? undefined) as GitHubOperation.SyncOptions | undefined,
                rewireRef,
              });
            }

            // Cross-fiber dedup for Person upserts: parallel per-target/issue work
            // can race two upserts for the same login (within a target — same
            // assignee on multiple issues — or across targets). Without serialization
            // both fibers find no foreign-key match, both insert, leaving duplicate
            // Person rows. The semaphore + cache pair gives us a single in-flight
            // upsert per login; subsequent callers read from `personByLogin`.
            const personByLogin = new Map<string, Person.Person>();
            const personSemaphore = yield* Effect.makeSemaphore(1);
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

            // Auto-pull the owning org + members for every unique owner in the
            // selected repo set. Done once per sync, not per repo, so picking 50
            // repos in a single org makes one `/orgs/{org}/members` call.
            const ownerLogins = new Set(targetEntries.map((target) => target.remoteRepo.owner.login));
            let pulledOrganizations = 0;
            for (const owner of ownerLogins) {
              // `/orgs/{owner}` returns 404 for user-owned repos (personal
              // accounts are not orgs). Treat that as "no org to sync" and
              // continue — the Project just won't have a parent organization.
              const orgResult = yield* Effect.either(GitHubApi.fetchOrg(owner));
              if (orgResult._tag === 'Left') {
                log.info('github sync: owner is not an org, skipping org/member pull', { owner });
                continue;
              }
              const organization = yield* upsertOrganization(orgResult.right);
              pulledOrganizations++;

              const members = yield* GitHubApi.fetchOrgMembers(owner);
              for (const member of members) {
                yield* ensurePerson(member, organization);
              }
            }

            let pulledTasks = 0;
            let pushedProjects = 0;
            let pushedTasks = 0;

            const perTarget = yield* Effect.forEach(
              targetEntries,
              ({ project, remoteRepo, remoteId, options }) =>
                Effect.gen(function* () {
                  const result = yield* Effect.either(
                    Effect.gen(function* () {
                      const since = sinceFromOptions(options);
                      const issues = yield* GitHubApi.fetchRepoIssues(remoteRepo.owner.login, remoteRepo.name, {
                        since,
                      });
                      const remoteIssuesById = new Map<string, GitHubApi.GitHubIssue>();
                      yield* Effect.forEach(
                        issues,
                        (issue) =>
                          Effect.gen(function* () {
                            // Resolve assignee — first assignee only for v1.
                            // External (non-org) assignees are upserted lazily; the
                            // semaphored `ensurePerson` dedups across fibers.
                            const assigneeUser = issue.assignees?.[0];
                            const assignedPerson = assigneeUser
                              ? yield* ensurePerson(assigneeUser, undefined)
                              : undefined;

                            const { created } = yield* upsertTask(integrationObj, issue, assignedPerson, project);
                            remoteIssuesById.set(String(issue.id), issue);
                            if (created) {
                              pulledTasks++;
                            }

                            // TODO(wittjosiah): Comments sync disabled — re-enable
                            // once chunked/yielded to avoid automerge_wasm crash
                            // when upserting many comments in one tick.
                          }),
                        { concurrency: ISSUE_CONCURRENCY },
                      );

                      // Push: snapshot-diff the local Project + Tasks for this
                      // repo and PATCH only the diverged fields. Errors on
                      // individual PATCHes propagate as a single Either-Left
                      // for this target so partial progress on other targets
                      // is preserved.
                      //
                      // TODO(wittjosiah): `remoteIssuesById` is built from
                      //   `fetchRepoIssues(..., { since })`, so when
                      //   `maxDaysBack` is set this push pass cannot see
                      //   locally-edited tasks whose remote issue is older
                      //   than the window. Switch the candidate set to the
                      //   local mirror (every Task with a GITHUB_SOURCE fk
                      //   under this repo) once we store `number` per task
                      //   so we don't need the remote payload to PATCH.
                      const pushResult = yield* pushRepoUpdates(integrationObj, remoteRepo, remoteIssuesById, {
                        updateIssue: (owner, repoName, issueNumber, input) =>
                          GitHubApi.updateIssue(owner, repoName, issueNumber, input).pipe(Effect.map(() => undefined)),
                        updateRepo: (owner, repoName, input) =>
                          GitHubApi.updateRepo(owner, repoName, input).pipe(Effect.map(() => undefined)),
                      });
                      pushedProjects += pushResult.projects;
                      pushedTasks += pushResult.tasks;
                    }),
                  );
                  return { remoteId, result };
                }),
              { concurrency: REPO_CONCURRENCY },
            );

            // Apply all `integrationObj.targets` mutations serially after the
            // parallel forEach so concurrent fibers don't race on the same array.
            // Three writes per target row at most: `object` (rewireRef), then
            // `lastSyncAt`/`lastError` from the per-target outcome, plus
            // `lastError` for repos the token can't see.
            Obj.update(integrationObj, (integrationObj) => {
              for (const { remoteId, rewireRef } of targetEntries) {
                if (!rewireRef) {
                  continue;
                }
                const idx = integrationObj.targets.findIndex((target) => target.remoteId === remoteId);
                if (idx >= 0) {
                  integrationObj.targets[idx].object = rewireRef;
                }
              }
              for (const { remoteId, result } of perTarget) {
                const idx = integrationObj.targets.findIndex((target) => target.remoteId === remoteId);
                if (idx < 0) {
                  continue;
                }
                if (result._tag === 'Right') {
                  integrationObj.targets[idx].lastSyncAt = new Date().toISOString();
                  integrationObj.targets[idx].lastError = undefined;
                } else {
                  integrationObj.targets[idx].lastError = formatGitHubSyncFailure(result.left);
                }
              }
              for (const remoteId of inaccessibleRemoteIds) {
                const idx = integrationObj.targets.findIndex((target) => target.remoteId === remoteId);
                if (idx >= 0) {
                  integrationObj.targets[idx].lastError = 'Repository not accessible to integration token';
                }
              }
            });

            // Log every per-target failure; counts above already reflect partial
            // progress on healthy targets.
            for (const { result } of perTarget) {
              if (result._tag === 'Left') {
                log.warn('github sync: target failed', { error: result.left });
              }
            }

            return {
              pulled: {
                organizations: pulledOrganizations,
                people: personByLogin.size,
                projects: targetEntries.length,
                tasks: pulledTasks,
                comments: 0,
              },
              pushed: {
                projects: pushedProjects,
                tasks: pushedTasks,
              },
            };
          }).pipe(
            Effect.provide(Database.layer(db)),
            Effect.provide(GitHubApi.GitHubCredentials.fromIntegration(integration)),
          ),
        );

        if (outcome._tag === 'Right') {
          yield* Effect.ignore(
            Operation.invoke(LayoutOperation.AddToast, {
              id: `${meta.id}.sync-success.${toastIdSuffix}`,
              icon: 'ph--check--regular',
              title: ['sync-toast.success.label', { ns: meta.id }],
            }),
          );
          return outcome.right;
        } else {
          const message = formatGitHubSyncFailure(outcome.left);
          yield* Effect.ignore(
            Operation.invoke(LayoutOperation.AddToast, {
              id: `${meta.id}.sync-error.${toastIdSuffix}`,
              icon: 'ph--warning--regular',
              title: ['sync-toast.error.label', { ns: meta.id }],
              description: message,
            }),
          );
          return yield* Effect.fail(outcome.left);
        }
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
