//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Actor, Message, Organization, Person, Project, Task, Thread } from '@dxos/types';

import { meta } from '#meta';

import { GITHUB_SOURCE } from '../constants';
import { formatGitHubSyncFailure } from '../errors';
import { GitHubApi } from '../services';
import { type SyncOptions, SyncGitHubRepositories } from './definitions';

//
// Direction: pull-only.
//
// v1 of this plugin pulls Organization, Person, Project, Task (issue/PR), and
// Thread/Message (comments) from GitHub into ECHO and never writes back. Push
// is intentionally deferred — the open question is attribution: a user-to-server
// OAuth token attributes any write to the authorizing user, which is wrong in
// shared spaces; an installation token attributes to the GitHub App with body-
// prefix attribution but needs server-side minting (KMS). Both options are real
// follow-ups but neither is in scope here.
//
// Practical consequence: local edits to mapped fields (Task.title,
// Task.description, Task.status, Org.name, etc.) are overwritten by the remote
// value on every sync. Local edits to NON-mapped fields (Task.priority,
// Task.estimate, Task.project, Person.notes, etc.) are preserved.
//
// Sync target shape: the user picks REPOSITORIES. The repos' owning orgs (and
// org members) are auto-pulled — a single Organization per unique owner across
// the selected repos, deduped within one sync pass. The user does not pick
// orgs directly.
//

//
// Tunables
//

/** Per-target parallelism across selected repos. */
const REPO_CONCURRENCY = 4;
const ISSUE_CONCURRENCY = 4;

//
// Foreign-key + lookup helpers
//

const fkFor = (id: string | number) => ({ source: GITHUB_SOURCE, id: String(id) });

/**
 * Generic foreign-key lookup. Schema is forwarded to `Filter.foreignKeys`
 * untyped — the caller supplies the result type via the explicit `T` parameter
 * (mirrors how plugin-trello casts after `Database.runQuery`).
 */
const findByForeignId = <T>(schema: Schema.Schema<any, any>, id: string | number) =>
  Effect.gen(function* () {
    const results = yield* Database.runQuery(Query.select(Filter.foreignKeys(schema as never, [fkFor(id)])));
    return results.length > 0 ? (results[0] as T) : undefined;
  });

//
// Field mappers (GitHub → DXOS)
//

/**
 * Maps GitHub issue state to a Task status. GitHub issues only have `open` /
 * `closed` — there's no "in progress" concept, so we collapse open→`todo` and
 * closed→`done`. PRs use the same mapping; merged PRs are reported as `closed`
 * by GitHub plus a non-null `pull_request.merged_at`.
 */
const issueStateToTaskStatus = (state: string): 'todo' | 'done' => (state === 'closed' ? 'done' : 'todo');

const sinceFromOptions = (options: SyncOptions | undefined): string | undefined => {
  const days = options?.maxDaysBack;
  if (typeof days !== 'number' || days <= 0) {
    return undefined;
  }
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
};

//
// Upsert helpers (all pull-only)
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

const upsertProject = Effect.fn('upsertProject')(function* (repo: GitHubApi.GitHubRepo) {
  const existing = yield* findByForeignId<Project.Project>(Project.Project, repo.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      existing.name = repo.full_name;
      if (repo.description != null) {
        existing.description = repo.description;
      }
    });
    return existing;
  }
  const created = Obj.make(Project.Project, {
    [Obj.Meta]: { keys: [fkFor(repo.id)] },
    name: repo.full_name,
    description: repo.description ?? undefined,
  });
  return yield* Database.add(created);
});

/**
 * Pull-only upsert for issue/PR → Task. Mapped fields (title, description,
 * status) are overwritten by remote on every sync; non-mapped fields (priority,
 * estimate, etc.) are preserved.
 */
const upsertTask = Effect.fn('upsertTask')(function* (
  issue: GitHubApi.GitHubIssue,
  assignedPerson: Person.Person | undefined,
  project: Project.Project,
) {
  const existing = yield* findByForeignId<Task.Task>(Task.Task, issue.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      existing.title = issue.title;
      existing.description = issue.body ?? '';
      existing.status = issueStateToTaskStatus(issue.state);
      if (assignedPerson && !existing.assigned) {
        existing.assigned = Ref.make(assignedPerson);
      }
      // Maintain the Task → Project ref. Only overwrite when missing or
      // pointing somewhere else (e.g. transferred-repo edge case); leave a
      // user-set project alone if it already matches.
      const currentProjectId = existing.project?.dxn.asEchoDXN()?.echoId;
      const projectId = Ref.make(project).dxn.asEchoDXN()?.echoId;
      if (!existing.project || (currentProjectId && projectId && currentProjectId !== projectId)) {
        existing.project = Ref.make(project);
      }
    });
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
  return { task: persisted, created: true };
});

/**
 * Pull-only upsert for issue/PR comments. One {@link Thread.Thread} per Task
 * (foreign-keyed `task:<task-fid>`); one {@link Message.Message} per remote
 * comment (foreign-keyed by comment.id). Local Messages without a foreign key
 * are preserved (the user might have added their own commentary). Remote
 * deletions are NOT mirrored — keep history.
 */
const syncCommentsForTask = Effect.fn('syncCommentsForTask')(function* (
  task: Task.Task,
  comments: ReadonlyArray<GitHubApi.GitHubComment>,
  authorByLogin: Map<string, Person.Person>,
) {
  if (comments.length === 0) {
    return 0;
  }

  // Find or create the thread anchored to this task.
  const taskFid = Obj.getMeta(task).keys.find((key) => key.source === GITHUB_SOURCE)?.id;
  if (!taskFid) {
    return yield* Effect.dieMessage('Task missing GitHub foreign key — upsertTask must run first.');
  }
  let thread = yield* findByForeignId<Thread.Thread>(Thread.Thread, `task:${taskFid}`);
  if (!thread) {
    const created = Thread.make({
      [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: `task:${taskFid}` }] },
      name: 'Comments',
      status: 'active',
      messages: [],
    });
    thread = yield* Database.add(created);
    // TODO(wittjosiah): Anchor thread → task via AnchoredTo relation. Skipped in
    //   v1 because the relation API requires a Database service round-trip
    //   that didn't fit the current handler shape; comments still discoverable
    //   via the foreign key (`task:<fid>`) but won't show in document/table
    //   comments-companion plank until the relation is added.
  }

  // Index existing messages by comment foreign id so we can update in place.
  const existingByFid = new Map<string, Message.Message>();
  for (const ref of thread.messages) {
    const target = ref.target;
    if (!target) {
      continue;
    }
    const fid = Obj.getMeta(target).keys.find((key) => key.source === GITHUB_SOURCE)?.id;
    if (fid) {
      existingByFid.set(fid, target);
    }
  }

  let added = 0;
  const newRefs: Array<Ref.Ref<Message.Message>> = [];
  for (const comment of comments) {
    const existing = existingByFid.get(String(comment.id));
    const senderLogin = comment.user?.login ?? 'unknown';
    // TODO(wittjosiah): Upsert a Person for unknown comment authors via
    //   `ensurePerson` (in the main handler scope) once comments are re-enabled,
    //   so external commenters get a `contact` ref like assignees do.
    const sender = authorByLogin.get(senderLogin);
    const senderActor: Actor.Actor = sender ? { name: senderLogin, contact: Ref.make(sender) } : { name: senderLogin };
    if (existing) {
      Obj.update(existing, (existing) => {
        existing.blocks = [{ _tag: 'text', text: comment.body ?? '' }];
        if (comment.created_at) {
          existing.created = comment.created_at;
        }
      });
      continue;
    }
    const message = Message.make({
      [Obj.Meta]: { keys: [fkFor(comment.id)] },
      created: comment.created_at ?? new Date().toISOString(),
      sender: senderActor,
      blocks: [{ _tag: 'text', text: comment.body ?? '' }],
    });
    const persisted = yield* Database.add(message);
    newRefs.push(Ref.make(persisted));
    added++;
  }

  if (newRefs.length > 0) {
    Obj.update(thread, (thread) => {
      thread.messages = [...thread.messages, ...newRefs];
    });
  }

  return added;
});

//
// Main handler
//

const handler: Operation.WithHandler<typeof SyncGitHubRepositories> = SyncGitHubRepositories.pipe(
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

      const integrationId = integration.dxn.asEchoDXN()?.echoId ?? 'unknown';
      const toastIdSuffix = repoRef
        ? `${integrationId}.${repoRef.dxn.asEchoDXN()?.echoId ?? 'unknown'}`
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
          const repoFilterId = repoRef?.dxn.asEchoDXN()?.echoId;

          // Materialize per-target work: ensure local Project exists, wire
          // `target.object` ref, then later batch-pull each repo's owning org
          // (deduped) and the repo's issues+PRs+comments.
          type TargetEntry = {
            entry: (typeof integrationObj.targets)[number];
            project: Project.Project;
            remoteRepo: GitHubApi.GitHubRepo;
            remoteId: string;
            options: SyncOptions | undefined;
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

            // Always upsert by foreign-key. If `target.object` is already pointing
            // at the same Project (the normal round-trip), the upsert finds it,
            // refreshes its fields, and returns the same instance — and we leave
            // `target.object` alone. If `target.object` was missing or pointed at
            // a different object, the upsert may have created a new Project (or
            // resolved an unrelated one); rewire `target.object` to whatever the
            // upsert returned so the user-visible target tracks the actual record.
            const project = yield* upsertProject(remoteRepo);
            const rewireRef = !localObj || localObj.id !== project.id ? Ref.make(project) : undefined;

            if (repoFilterId && project.id !== repoFilterId) {
              continue;
            }

            targetEntries.push({
              entry: target,
              project,
              remoteRepo,
              remoteId: foreignId,
              options: (target.options ?? undefined) as SyncOptions | undefined,
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

                          const { created } = yield* upsertTask(issue, assignedPerson, project);
                          if (created) {
                            pulledTasks++;
                          }

                          // TODO(wittjosiah): Comments sync disabled — re-enable
                          // once chunked/yielded to avoid automerge_wasm crash
                          // when upserting many comments in one tick.
                        }),
                      { concurrency: ISSUE_CONCURRENCY },
                    );
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
