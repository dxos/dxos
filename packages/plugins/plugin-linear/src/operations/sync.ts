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
import { type Actor, Message, Project, Task, Thread } from '@dxos/types';

import { meta } from '#meta';

import { LINEAR_SOURCE } from '../constants';
import { IntegrationDatabaseMissingError, formatLinearSyncFailure } from '../errors';
import { LinearApi } from '../services';
import { SyncLinearTeam } from './definitions';

// ────────────────────────────────────────────────────────────────────────────
// Cross-source duplicates — design intent.
//
// This plugin creates a fresh local object the first time it sees a remote
// id, even when an equivalent object already exists in the workspace (e.g. a
// Project you already have whose name matches a Linear project). That's
// intentional v1 behaviour and matches `plugin-github` / `plugin-trello`. The
// long-term direction is a `SameAs` relation between distinct objects (TBD in
// `@dxos/types`), not foreign-key auto-merge.
// ────────────────────────────────────────────────────────────────────────────

/** Per-team parallelism across selected targets. */
const TARGET_CONCURRENCY = 2;

/** Per-issue parallelism for comment fetches. */
const COMMENT_CONCURRENCY = 4;

const fkFor = (id: string) => ({ source: LINEAR_SOURCE, id });

/**
 * Generic foreign-key lookup. Schema is forwarded to `Filter.foreignKeys`
 * untyped — caller supplies the result type via the explicit `T` parameter.
 */
const findByForeignId = <T>(schema: Schema.Schema<any, any>, id: string) =>
  Effect.gen(function* () {
    const results = yield* Database.runQuery(Query.select(Filter.foreignKeys(schema as never, [fkFor(id)])));
    return results.length > 0 ? (results[0] as T) : undefined;
  });

// ── Upsert helpers (pull-only) ─────────────────────────────────────────────

/**
 * Pull-only upsert for a Linear project → DXOS Project. Local edits to
 * `name`/`description` are overwritten on every sync. v1 expectation; see
 * the consolidated note at the top of this file.
 */
const upsertProject = Effect.fn('upsertProject')(function* (project: LinearApi.Project) {
  const existing = yield* findByForeignId<Project.Project>(Project.Project, project.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      const m = existing as Obj.Mutable<typeof existing>;
      m.name = project.name;
      if (project.description != null) {
        m.description = project.description;
      }
    });
    return existing;
  }
  const created = Obj.make(Project.Project, {
    [Obj.Meta]: { keys: [fkFor(project.id)] },
    name: project.name,
    description: project.description ?? undefined,
  });
  return yield* Database.add(created);
});

/**
 * Pull-only upsert for a Linear issue → DXOS Task. Mapped fields:
 *  - title (from Linear `title`)
 *  - description (from Linear `description`)
 *  - status (Linear state.type → 'todo' | 'in-progress' | 'done')
 *  - priority (Linear 0..4 → enum, undefined when no priority)
 *  - estimate (numeric)
 *  - project (Ref to local Project, when the issue has one)
 *
 * `assigned` is intentionally NOT set: this plugin does not sync Person
 * objects in v1, so we have nothing to point at.
 */
const upsertTask = Effect.fn('upsertTask')(function* (
  issue: LinearApi.Issue,
  projectByRemoteId: Map<string, Project.Project>,
) {
  const projectRef = issue.project ? projectByRemoteId.get(issue.project.id) : undefined;
  const status = LinearApi.stateTypeToTaskStatus(issue.state.type);
  const priority = LinearApi.priorityNumberToTaskPriority(issue.priority);

  const existing = yield* findByForeignId<Task.Task>(Task.Task, issue.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      const m = existing as Obj.Mutable<typeof existing>;
      m.title = issue.title;
      m.description = issue.description ?? '';
      m.status = status;
      if (priority !== undefined) {
        m.priority = priority;
      }
      if (issue.estimate != null) {
        m.estimate = issue.estimate;
      }
      if (projectRef && !m.project) {
        m.project = Ref.make(projectRef);
      }
    });
    return { task: existing, created: false };
  }

  const created = Task.make({
    title: issue.title,
    description: issue.description ?? '',
    status,
    priority,
    estimate: issue.estimate ?? undefined,
    project: projectRef ? Ref.make(projectRef) : undefined,
  });
  Obj.update(created, (created) => {
    Obj.getMeta(created).keys.push(fkFor(issue.id));
  });
  const persisted = yield* Database.add(created);
  return { task: persisted, created: true };
});

/**
 * Pull-only upsert for issue comments. One {@link Thread.Thread} per Task
 * (foreign-keyed `task:<issueId>`); one {@link Message.Message} per remote
 * comment (foreign-keyed by comment.id). The `sender` is a plain-string
 * {@link Actor.Actor} — this plugin doesn't sync Person objects, so we record
 * the author's display name only.
 *
 * Local Messages without a Linear foreign key are preserved (the user might
 * have added their own commentary). Remote-deleted comments are NOT mirrored
 * locally to avoid losing history.
 */
const syncCommentsForTask = Effect.fn('syncCommentsForTask')(function* (
  task: Task.Task,
  comments: ReadonlyArray<LinearApi.Comment>,
) {
  if (comments.length === 0) {
    return 0;
  }

  const taskFid = Obj.getMeta(task).keys.find((k) => k.source === LINEAR_SOURCE)?.id;
  if (!taskFid) {
    // Defensive — every Task we materialize has a Linear foreign key by
    // construction in `upsertTask`.
    return 0;
  }

  let thread = yield* findByForeignId<Thread.Thread>(Thread.Thread, `task:${taskFid}`);
  if (!thread) {
    thread = Thread.make({
      name: 'Comments',
      status: 'active',
      messages: [],
    });
    Obj.update(thread, (thread) => {
      Obj.getMeta(thread).keys.push({ source: LINEAR_SOURCE, id: `task:${taskFid}` });
    });
    thread = yield* Database.add(thread);
  }

  const existingByFid = new Map<string, Message.Message>();
  for (const ref of thread.messages) {
    const target = ref.target;
    if (!target) {
      continue;
    }
    const fid = Obj.getMeta(target).keys.find((k) => k.source === LINEAR_SOURCE)?.id;
    if (fid) {
      existingByFid.set(fid, target);
    }
  }

  let added = 0;
  const newRefs: Array<Ref.Ref<Message.Message>> = [];
  for (const comment of comments) {
    const senderName = comment.user?.name ?? 'unknown';
    const sender: Actor.Actor = { name: senderName };
    const existing = existingByFid.get(comment.id);
    if (existing) {
      Obj.update(existing, (existing) => {
        const m = existing as Obj.Mutable<typeof existing>;
        m.blocks = [{ _tag: 'text', text: comment.body }];
        if (comment.createdAt) {
          m.created = comment.createdAt;
        }
      });
      continue;
    }
    const message = Message.make({
      created: comment.createdAt ?? new Date().toISOString(),
      sender,
      blocks: [{ _tag: 'text', text: comment.body }],
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

// ── Main handler ───────────────────────────────────────────────────────────

const handler: Operation.WithHandler<typeof SyncLinearTeam> = SyncLinearTeam.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration, team: teamRef }) {
      const integrationTarget = integration.target;
      const db = integrationTarget ? Obj.getDatabase(integrationTarget) : undefined;
      if (!db) {
        return yield* Effect.fail(new IntegrationDatabaseMissingError());
      }

      const integrationId = integration.dxn.asEchoDXN()?.echoId ?? 'unknown';
      const toastIdSuffix = teamRef
        ? `${integrationId}.${teamRef.dxn.asEchoDXN()?.echoId ?? 'unknown'}`
        : integrationId;

      const outcome = yield* Effect.either(
        Effect.gen(function* () {
          const integrationObj = yield* Database.load(integration);

          // Linear teams are addressed by string id; targets store that id
          // directly as `remoteId`. Targets with no `remoteId` are skipped.
          // We resolve a per-team metadata map from the live API rather than
          // trusting the (possibly stale) `target.name`.
          const allTeams = yield* LinearApi.fetchTeams();
          const teamsById = new Map(allTeams.map((t) => [t.id, t]));

          const teamFilterEchoId = teamRef?.dxn.asEchoDXN()?.echoId;

          const targetEntries: Array<{
            entry: (typeof integrationObj.targets)[number];
            remoteTeam: LinearApi.Team;
            remoteId: string;
          }> = [];
          for (const target of integrationObj.targets) {
            const remoteId = target.remoteId;
            if (!remoteId) {
              continue;
            }
            const remoteTeam = teamsById.get(remoteId);
            if (!remoteTeam) {
              continue;
            }
            // Optional narrow filter to a single target by its local
            // `target.object` ref. Linear targets don't always have a
            // materialized local object (we don't create a Team-shaped
            // object — a team is just a sync-scope), so this filter is
            // best-effort.
            if (teamFilterEchoId) {
              const targetEchoId = target.object?.dxn.asEchoDXN()?.echoId;
              if (targetEchoId !== teamFilterEchoId) {
                continue;
              }
            }
            targetEntries.push({ entry: target, remoteTeam, remoteId });
          }

          let pulledTeams = 0;
          let pulledProjects = 0;
          let pulledTasks = 0;
          let pulledComments = 0;

          const perTarget = yield* Effect.forEach(
            targetEntries,
            ({ remoteTeam, remoteId }) =>
              Effect.gen(function* () {
                const result = yield* Effect.either(
                  Effect.gen(function* () {
                    pulledTeams++;

                    // Projects → DXOS Projects.
                    const projects = yield* LinearApi.fetchTeamProjects(remoteTeam.id);
                    const projectByRemoteId = new Map<string, Project.Project>();
                    for (const project of projects) {
                      const local = yield* upsertProject(project);
                      projectByRemoteId.set(project.id, local);
                      pulledProjects++;
                    }

                    // Issues → DXOS Tasks.
                    const issues = yield* LinearApi.fetchTeamIssues(remoteTeam.id);
                    const taskByIssueId = new Map<string, Task.Task>();
                    for (const issue of issues) {
                      const { task, created } = yield* upsertTask(issue, projectByRemoteId);
                      taskByIssueId.set(issue.id, task);
                      if (created) {
                        pulledTasks++;
                      }
                    }

                    // Comments → Thread + Messages, parallelized per issue.
                    yield* Effect.forEach(
                      issues,
                      (issue) =>
                        Effect.gen(function* () {
                          const task = taskByIssueId.get(issue.id);
                          if (!task) {
                            return;
                          }
                          const comments = yield* LinearApi.fetchIssueComments(issue.id);
                          const added = yield* syncCommentsForTask(task, comments);
                          pulledComments += added;
                        }),
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
                      lastError: formatLinearSyncFailure(result.left),
                    };
                  }
                });

                return result;
              }),
            { concurrency: TARGET_CONCURRENCY },
          );

          for (const r of perTarget) {
            if (r._tag === 'Left') {
              log.warn('linear sync: target failed', { error: r.left });
            }
          }

          return {
            pulled: {
              teams: pulledTeams,
              projects: pulledProjects,
              tasks: pulledTasks,
              comments: pulledComments,
            },
          };
        }).pipe(
          Effect.provide(Database.layer(db)),
          Effect.provide(LinearApi.LinearCredentials.fromIntegration(integration)),
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
        const message = formatLinearSyncFailure(outcome.left);
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
