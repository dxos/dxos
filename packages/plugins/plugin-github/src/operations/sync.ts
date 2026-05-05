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
import { Integration } from '@dxos/plugin-integration/types';
import { Actor, Message, Organization, Person, Project, Task, Thread } from '@dxos/types';

import { meta } from '#meta';

import { GITHUB_SOURCE } from '../constants';
import { IntegrationDatabaseMissingError, formatGitHubSyncFailure } from '../errors';
import { GitHubApi } from '../services';
import { SyncGitHubOrganization } from './definitions';

// ────────────────────────────────────────────────────────────────────────────
// Cross-source duplicates — design intent.
//
// Today every upsert path in this file CREATES a fresh local object the first
// time it sees a remote id, even when an equivalent object already exists in
// the workspace (e.g. a Person you already have in contacts who is also a
// GitHub member). That's the simplest implementation and matches Trello's v1
// behaviour, but it's wrong long-term: the same real-world entity ends up as
// multiple ECHO objects, and bulk actions / status drift become user-visible.
//
// The chosen direction is NOT to merge foreign keys onto a single object.
// Instead, we'll introduce a `SameAs` relation between distinct objects so
// each plugin (github, linear, trello, …) keeps writing its own typed object
// and stays cleanly in sync with its remote, while Composer renders linked
// objects as a group and fans bulk actions across them. Tradeoffs vs. true
// merge: reversible, respects per-system fields (Linear cycles, GitHub
// labels) without coercing into a lossy common shape, and per-action conflict
// handling instead of per-field three-way merges across heterogeneous sources.
//
// Follow-up work tracked separately:
//   1. Land a `SameAs` relation type (likely in @dxos/types).
//   2. Manual "link this object to that one" affordance (right-click /
//      command palette).
//   3. Automation pass — suggest candidate links from sync output (LLM or
//      deterministic field match for Person/Organization/Project where it's
//      reliable). Surfaced as suggestions, not auto-applied.
//
// Until (1)–(3) land, this plugin produces duplicates on first sight when an
// equivalent local object already exists. That is intentional v1 behaviour.
// ────────────────────────────────────────────────────────────────────────────

// ── Tunables ────────────────────────────────────────────────────────────────

/** Per-org parallelism across selected targets. */
const TARGET_CONCURRENCY = 2;

/** Per-repo parallelism within an org's issue+PR fetches. */
const REPO_CONCURRENCY = 4;

/** Per-issue parallelism for comment fetches. */
const COMMENT_CONCURRENCY = 4;

// ── Three-way merge helpers (Task-only) ────────────────────────────────────

const TASK_FIELDS = ['title', 'description', 'status'] as const;
type TaskField = (typeof TASK_FIELDS)[number];
type TaskSnapshot = Partial<Record<TaskField, unknown>>;

const mergeField = <T>(
  local: T,
  remote: T,
  snapshot: T | undefined,
): { value: T; source: 'local' | 'remote' | 'unchanged' } => {
  if (snapshot === undefined) {
    return { value: remote, source: local === remote ? 'unchanged' : 'remote' };
  }
  const localChanged = local !== snapshot;
  const remoteChanged = remote !== snapshot;
  if (!localChanged && !remoteChanged) {
    return { value: local, source: 'unchanged' };
  }
  if (!localChanged && remoteChanged) {
    return { value: remote, source: 'remote' };
  }
  if (localChanged && !remoteChanged) {
    return { value: local, source: 'local' };
  }
  return { value: remote, source: 'remote' };
};

const writeSnapshot = (integration: Integration.Integration, foreignId: string, snapshot: object): void => {
  Obj.update(integration, (integration) => {
    const m = integration as Obj.Mutable<typeof integration>;
    const existing = (m.snapshots ?? {}) as Record<string, unknown>;
    m.snapshots = { ...existing, [foreignId]: snapshot };
  });
};

const readSnapshot = <T extends object>(integration: Integration.Integration, foreignId: string): T | undefined => {
  const snapshots = (integration.snapshots ?? {}) as Record<string, unknown>;
  return snapshots[foreignId] as T | undefined;
};

// ── Foreign-key + lookup helpers ────────────────────────────────────────────

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

// ── Field mappers (GitHub → DXOS) ──────────────────────────────────────────

/**
 * Maps GitHub issue state to a Task status. GitHub issues only have `open` /
 * `closed` — there's no "in progress" concept, so we collapse open→`todo` and
 * closed→`done`. PRs use the same mapping; merged PRs are reported as `closed`
 * by GitHub plus a non-null `pull_request.merged_at`.
 */
const issueStateToTaskStatus = (state: string): 'todo' | 'done' => (state === 'closed' ? 'done' : 'todo');

const taskStatusToIssueState = (status: string | undefined): 'open' | 'closed' =>
  status === 'done' ? 'closed' : 'open';

// ── Upsert helpers (pull-only, except Task) ────────────────────────────────

/**
 * Pull-only upsert for Organization. Local edits to mapped fields are
 * overwritten by remote values on every sync — see the consolidated TODO at
 * the top of this file for the planned match-to-existing flow.
 */
const upsertOrganization = Effect.fn('upsertOrganization')(function* (org: GitHubApi.GitHubOrg) {
  const existing = yield* findByForeignId<Organization.Organization>(Organization.Organization, org.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      const m = existing as Obj.Mutable<typeof existing>;
      m.name = org.name ?? org.login;
      if (org.description != null) {
        m.description = org.description;
      }
      if (org.blog) {
        m.website = org.blog;
      }
      if (org.avatar_url) {
        m.image = org.avatar_url;
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
      const m = existing as Obj.Mutable<typeof existing>;
      m.fullName = user.name ?? user.login;
      if (user.avatar_url) {
        m.image = user.avatar_url;
      }
      if (organization && !m.organization) {
        m.organization = Ref.make(organization);
      }
      // Add the github.com/<login> identity if not already present.
      const handle = `github.com/${user.login}`;
      const ids = m.identities ?? [];
      if (!ids.some((entry: { value: string }) => entry.value === handle)) {
        m.identities = [...ids, { label: 'github', value: handle }];
      }
    });
    return existing;
  }
  const created = Person.make({
    fullName: user.name ?? user.login,
    image: user.avatar_url ?? undefined,
    organization: organization ? Ref.make(organization) : undefined,
    identities: [{ label: 'github', value: `github.com/${user.login}` }],
  });
  // Stamp the foreign key after Person.make so we don't fight the helper.
  Obj.update(created, (created) => {
    Obj.getMeta(created).keys.push(fkFor(user.id));
  });
  return yield* Database.add(created);
});

const upsertProject = Effect.fn('upsertProject')(function* (repo: GitHubApi.GitHubRepo) {
  const existing = yield* findByForeignId<Project.Project>(Project.Project, repo.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      const m = existing as Obj.Mutable<typeof existing>;
      m.name = repo.full_name;
      if (repo.description != null) {
        m.description = repo.description;
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
 * Three-way-merged upsert for an issue/PR → Task. Mapped fields:
 *  - title (from GitHub `title`)
 *  - description (from GitHub `body`)
 *  - status ('todo'/'done' derived from GitHub `state`)
 *
 * Anything else the user added locally (priority, estimate, assigned, labels
 * stored as inline tags) is preserved across syncs.
 */
const upsertTask = Effect.fn('upsertTask')(function* (
  integration: Integration.Integration,
  issue: GitHubApi.GitHubIssue,
  assignedPerson: Person.Person | undefined,
) {
  const remoteFields: Record<TaskField, unknown> = {
    title: issue.title,
    description: issue.body ?? '',
    status: issueStateToTaskStatus(issue.state),
  };

  const existing = yield* findByForeignId<Task.Task>(Task.Task, issue.id);

  if (existing) {
    const snapshot = readSnapshot<TaskSnapshot>(integration, String(issue.id)) ?? {};
    const fields = existing as unknown as Record<string, unknown>;
    const writes: Partial<Record<TaskField, unknown>> = {};
    for (const k of TASK_FIELDS) {
      const result = mergeField(fields[k], remoteFields[k], snapshot[k]);
      if (result.source === 'remote' && fields[k] !== result.value) {
        writes[k] = result.value;
      }
    }
    if (Object.keys(writes).length > 0) {
      Obj.update(existing, (existing) => {
        const m = existing as unknown as Record<string, unknown>;
        for (const [k, v] of Object.entries(writes)) {
          m[k] = v;
        }
      });
    }
    if (assignedPerson) {
      Obj.update(existing, (existing) => {
        const m = existing as Obj.Mutable<typeof existing>;
        if (!m.assigned) {
          m.assigned = Ref.make(assignedPerson);
        }
      });
    }
    writeSnapshot(integration, String(issue.id), remoteFields);
    return { task: existing, created: false };
  }

  const created = Task.make({
    title: issue.title,
    description: issue.body ?? '',
    status: issueStateToTaskStatus(issue.state),
    assigned: assignedPerson ? Ref.make(assignedPerson) : undefined,
  });
  Obj.update(created, (created) => {
    Obj.getMeta(created).keys.push(fkFor(issue.id));
  });
  const persisted = yield* Database.add(created);
  writeSnapshot(integration, String(issue.id), remoteFields);
  return { task: persisted, created: true };
});

/**
 * Pull-only upsert for issue/PR comments. One {@link Thread.Thread} per Task,
 * anchored via {@link AnchoredTo}; one {@link Message.Message} per remote
 * comment (foreign-keyed by comment.id). Local Messages without a foreign key
 * are preserved (the user might have added their own commentary). Remote
 * deletions of comments are NOT mirrored locally — would soft-delete here, but
 * we keep the existing Message in place so as not to lose history.
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
  let thread = yield* findByForeignId<Thread.Thread>(
    Thread.Thread,
    `task:${Obj.getMeta(task).keys.find((k) => k.source === GITHUB_SOURCE)?.id ?? ''}`,
  );
  if (!thread) {
    const taskFid = Obj.getMeta(task).keys.find((k) => k.source === GITHUB_SOURCE)?.id;
    thread = Thread.make({
      name: 'Comments',
      status: 'active',
      messages: [],
    });
    if (taskFid) {
      Obj.update(thread, (thread) => {
        Obj.getMeta(thread).keys.push({ source: GITHUB_SOURCE, id: `task:${taskFid}` });
      });
    }
    thread = yield* Database.add(thread);
    // TODO(burdon): Anchor thread → task via AnchoredTo relation. Skipped in
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
    const fid = Obj.getMeta(target).keys.find((k) => k.source === GITHUB_SOURCE)?.id;
    if (fid) {
      existingByFid.set(fid, target);
    }
  }

  let added = 0;
  const newRefs: Array<Ref.Ref<Message.Message>> = [];
  for (const comment of comments) {
    const existing = existingByFid.get(String(comment.id));
    const senderLogin = comment.user?.login ?? 'unknown';
    const sender = authorByLogin.get(senderLogin);
    const senderActor: Actor.Actor = sender ? { name: senderLogin, contact: Ref.make(sender) } : { name: senderLogin };
    if (existing) {
      Obj.update(existing, (existing) => {
        const m = existing as Obj.Mutable<typeof existing>;
        m.blocks = [{ _tag: 'text', text: comment.body ?? '' }];
        if (comment.created_at) {
          m.created = comment.created_at;
        }
      });
      continue;
    }
    const message = Message.make({
      created: comment.created_at ?? new Date().toISOString(),
      sender: senderActor,
      blocks: [{ _tag: 'text', text: comment.body ?? '' }],
    });
    Obj.update(message, (message) => {
      Obj.getMeta(message).keys.push(fkFor(comment.id));
    });
    const persisted = yield* Database.add(message);
    newRefs.push(Ref.make(persisted));
    added++;
  }

  if (newRefs.length > 0) {
    Obj.update(thread, (thread) => {
      const m = thread as Obj.Mutable<typeof thread>;
      m.messages = [...m.messages, ...newRefs];
    });
  }

  return added;
});

// ── Push (Tasks only) ──────────────────────────────────────────────────────

type PushPayload = {
  task: Task.Task;
  owner: string;
  repo: string;
  issueNumber: number;
  diverged: GitHubApi.UpdateIssueInput;
};

const collectTaskPushes = (
  integration: Integration.Integration,
  taskByForeignId: Map<string, Task.Task>,
  issueByForeignId: Map<string, GitHubApi.GitHubIssue>,
  repoFullNameByIssueId: Map<string, string>,
): PushPayload[] => {
  const pushes: PushPayload[] = [];
  for (const [fid, task] of taskByForeignId) {
    if (Obj.isDeleted(task)) {
      continue;
    }
    const issue = issueByForeignId.get(fid);
    if (!issue) {
      continue;
    }
    const fullName = repoFullNameByIssueId.get(fid);
    if (!fullName) {
      continue;
    }
    const [owner, repo] = fullName.split('/', 2);
    if (!owner || !repo) {
      continue;
    }
    const snapshot = readSnapshot<TaskSnapshot>(integration, fid) ?? {};
    const fields = task as unknown as Record<string, unknown>;
    const localTitle = typeof fields.title === 'string' ? fields.title : '';
    const localDesc = typeof fields.description === 'string' ? fields.description : '';
    const localStatus = typeof fields.status === 'string' ? fields.status : undefined;

    const diverged: GitHubApi.UpdateIssueInput = {};
    if (snapshot.title !== undefined && snapshot.title !== localTitle) {
      diverged.title = localTitle;
    }
    if (snapshot.description !== undefined && snapshot.description !== localDesc) {
      diverged.body = localDesc;
    }
    if (snapshot.status !== undefined && snapshot.status !== localStatus) {
      diverged.state = taskStatusToIssueState(localStatus);
    }
    if (Object.keys(diverged).length === 0) {
      continue;
    }
    pushes.push({ task, owner, repo, issueNumber: issue.number, diverged });
  }
  return pushes;
};

// ── Main handler ───────────────────────────────────────────────────────────

const handler: Operation.WithHandler<typeof SyncGitHubOrganization> = SyncGitHubOrganization.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration, organization: orgRef }) {
      const integrationTarget = integration.target;
      const db = integrationTarget ? Obj.getDatabase(integrationTarget) : undefined;
      if (!db) {
        return yield* Effect.fail(new IntegrationDatabaseMissingError());
      }

      const integrationId = integration.dxn.asEchoDXN()?.echoId ?? 'unknown';
      const toastIdSuffix = orgRef ? `${integrationId}.${orgRef.dxn.asEchoDXN()?.echoId ?? 'unknown'}` : integrationId;

      const outcome = yield* Effect.either(
        Effect.gen(function* () {
          const integrationObj = yield* Database.load(integration);

          // Fetch all the user's orgs once so each target row can find its
          // remote org metadata. Targets store the numeric org id as
          // `remoteId` (a stringified integer); compare loosely.
          const allOrgs = yield* GitHubApi.fetchUserOrgs();
          const orgsById = new Map(allOrgs.map((o) => [String(o.id), o]));

          // Optional narrow filter to a single Organization echo id.
          const orgFilterId = orgRef?.dxn.asEchoDXN()?.echoId;

          // Materialize per-target work: ensure local Organization exists,
          // wire `target.object` ref, then pull members, repos, issues+PRs,
          // and comments. Per-target failures don't abort the whole sync.
          const targetEntries: Array<{
            entry: (typeof integrationObj.targets)[number];
            organization: Organization.Organization;
            remoteOrg: GitHubApi.GitHubOrg;
            remoteId: string;
          }> = [];
          for (const target of integrationObj.targets) {
            let foreignId = target.remoteId;
            let localObj = target.object?.target;
            if (foreignId === undefined && localObj) {
              foreignId = Obj.getMeta(localObj).keys.find((k) => k.source === GITHUB_SOURCE)?.id;
            }
            if (foreignId === undefined) {
              continue;
            }
            const remoteOrg = orgsById.get(foreignId);
            if (!remoteOrg) {
              continue;
            }

            // Materialize the local Organization on demand.
            let organization: Organization.Organization;
            if (localObj && Obj.instanceOf(Organization.Organization, localObj)) {
              organization = localObj as Organization.Organization;
              // Refresh fields.
              yield* upsertOrganization(remoteOrg);
            } else {
              organization = yield* upsertOrganization(remoteOrg);
              const materializedRef = Ref.make(organization as unknown as Obj.Any);
              Obj.update(integrationObj, (integrationObj) => {
                const mutable = integrationObj as Obj.Mutable<typeof integrationObj>;
                const idx = mutable.targets.findIndex((t) => t.remoteId === foreignId);
                if (idx >= 0) {
                  mutable.targets[idx] = { ...mutable.targets[idx], object: materializedRef };
                }
              });
            }

            const targetEchoId = Ref.make(organization as unknown as Obj.Any).dxn.asEchoDXN()?.echoId;
            if (orgFilterId && targetEchoId !== orgFilterId) {
              continue;
            }

            targetEntries.push({ entry: target, organization, remoteOrg, remoteId: foreignId });
          }

          let pulledOrganizations = 0;
          let pulledPeople = 0;
          let pulledProjects = 0;
          let pulledTasks = 0;
          let pulledComments = 0;
          let pushedTasks = 0;

          const perTarget = yield* Effect.forEach(
            targetEntries,
            ({ organization, remoteOrg, remoteId }) =>
              Effect.gen(function* () {
                const result = yield* Effect.either(
                  Effect.gen(function* () {
                    pulledOrganizations++;

                    // Members → Persons.
                    const members = yield* GitHubApi.fetchOrgMembers(remoteOrg.login);
                    const personByLogin = new Map<string, Person.Person>();
                    for (const member of members) {
                      const person = yield* upsertPerson(member, organization);
                      personByLogin.set(member.login, person);
                      pulledPeople++;
                    }

                    // Repos → Projects.
                    const repos = yield* GitHubApi.fetchOrgRepos(remoteOrg.login);
                    const projectByRepoId = new Map<number, Project.Project>();
                    for (const repo of repos) {
                      const project = yield* upsertProject(repo);
                      projectByRepoId.set(repo.id, project);
                      pulledProjects++;
                    }

                    // For each repo: fetch issues+PRs, upsert Tasks, fetch
                    // comments per task, upsert Thread/Messages. Bound
                    // concurrency to keep us under GitHub's 5 000-req/hr
                    // primary rate limit and the per-endpoint secondary
                    // limits.
                    const taskByForeignId = new Map<string, Task.Task>();
                    const issueByForeignId = new Map<string, GitHubApi.GitHubIssue>();
                    const repoFullNameByIssueId = new Map<string, string>();

                    yield* Effect.forEach(
                      repos,
                      (repo) =>
                        Effect.gen(function* () {
                          const issues = yield* GitHubApi.fetchRepoIssues(repo.owner.login, repo.name);
                          for (const issue of issues) {
                            // Resolve assignee — first assignee only for v1.
                            const assigneeLogin = issue.assignees?.[0]?.login;
                            let assignedPerson: Person.Person | undefined = assigneeLogin
                              ? personByLogin.get(assigneeLogin)
                              : undefined;
                            // External (non-org) assignees: upsert a
                            // standalone Person without an org link.
                            if (!assignedPerson && issue.assignees?.[0]) {
                              assignedPerson = yield* upsertPerson(issue.assignees[0], undefined);
                              personByLogin.set(issue.assignees[0].login, assignedPerson);
                              pulledPeople++;
                            }

                            const { task, created } = yield* upsertTask(integrationObj, issue, assignedPerson);
                            if (created) {
                              pulledTasks++;
                            }
                            taskByForeignId.set(String(issue.id), task);
                            issueByForeignId.set(String(issue.id), issue);
                            repoFullNameByIssueId.set(String(issue.id), repo.full_name);

                            // Pull comments. `issue.comments` is the count;
                            // skip the round-trip when zero.
                            if ((issue.comments ?? 0) > 0) {
                              const comments = yield* GitHubApi.fetchIssueComments(
                                repo.owner.login,
                                repo.name,
                                issue.number,
                              );
                              const added = yield* syncCommentsForTask(task, comments, personByLogin);
                              pulledComments += added;
                            }
                          }
                        }),
                      { concurrency: REPO_CONCURRENCY },
                    );

                    // Push diverged tasks.
                    const pushes = collectTaskPushes(
                      integrationObj,
                      taskByForeignId,
                      issueByForeignId,
                      repoFullNameByIssueId,
                    );
                    yield* Effect.forEach(
                      pushes,
                      ({ task, owner, repo, issueNumber, diverged }) =>
                        Effect.gen(function* () {
                          yield* GitHubApi.updateIssue(owner, repo, issueNumber, diverged);
                          // Refresh the snapshot so the next pull doesn't
                          // detect divergence again.
                          const fid = Obj.getMeta(task).keys.find((k) => k.source === GITHUB_SOURCE)?.id;
                          if (fid) {
                            const fields = task as unknown as Record<string, unknown>;
                            writeSnapshot(integrationObj, fid, {
                              title: fields.title,
                              description: fields.description,
                              status: fields.status,
                            });
                          }
                          pushedTasks++;
                        }).pipe(
                          Effect.catchAll((err) => {
                            log.warn('github push: updateIssue failed', { owner, repo, issueNumber, err });
                            return Effect.void;
                          }),
                        ),
                      { concurrency: COMMENT_CONCURRENCY },
                    );
                  }),
                );

                Obj.update(integrationObj, (integrationObj) => {
                  const m = integrationObj as Obj.Mutable<typeof integrationObj>;
                  const idx = m.targets.findIndex((t) => t.remoteId === remoteId);
                  if (idx < 0) {
                    return;
                  }
                  if (result._tag === 'Right') {
                    m.targets[idx] = {
                      ...m.targets[idx],
                      lastSyncAt: new Date().toISOString(),
                      lastError: undefined,
                    };
                  } else {
                    m.targets[idx] = {
                      ...m.targets[idx],
                      lastError: formatGitHubSyncFailure(result.left),
                    };
                  }
                });

                return result;
              }),
            { concurrency: TARGET_CONCURRENCY },
          );

          // Surface the first per-target error (if any) so the toast carries
          // a meaningful message; counts above already reflect partial
          // progress on healthy targets.
          for (const r of perTarget) {
            if (r._tag === 'Left') {
              log.warn('github sync: target failed', { error: r.left });
            }
          }

          return {
            pulled: {
              organizations: pulledOrganizations,
              people: pulledPeople,
              projects: pulledProjects,
              tasks: pulledTasks,
              comments: pulledComments,
            },
            pushed: { tasks: pushedTasks },
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
