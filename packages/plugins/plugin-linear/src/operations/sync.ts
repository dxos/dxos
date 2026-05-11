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
import { Project, Task } from '@dxos/types';

import { meta } from '#meta';

import { LINEAR_SOURCE } from '../constants';
import { formatLinearSyncFailure } from '../errors';
import { LinearApi } from '../services';
import { LinearOperation } from '../types';

//
// Direction: pull-only.
//
// v1 of this plugin pulls Project and Task (issue) from Linear into ECHO and
// never writes back. Push is intentionally deferred.
//
// Practical consequence: local edits to mapped fields (Task.title,
// Task.description, Task.status, Task.priority, Task.estimate) are
// overwritten by the remote value on every sync. Local edits to NON-mapped
// fields (Project.image, etc.) are preserved.
//
// People are NOT synced. `Task.assigned` is left unset; the Linear assignee's
// display name is intentionally dropped. (See the cross-source duplicates
// note below for why we don't try to fuzzy-match local Persons.)
//
// Comments are NOT synced in v1 — mirrors plugin-github's stance: re-enable
// once chunked/yielded to avoid automerge_wasm crashes when upserting many
// messages in one tick.
//
// Sync target shape: the user picks Linear TEAMS. Each team's projects and
// issues are pulled. The user does not pick projects directly.
//

//
// Cross-source duplicates — design intent.
//
// This plugin creates a fresh local object the first time it sees a remote
// id, even when an equivalent object already exists in the workspace. That's
// intentional v1 behaviour and matches `plugin-github`. The long-term
// direction is a `SameAs` relation between distinct objects (TBD in
// `@dxos/types`), not foreign-key auto-merge.
//

//
// Tunables
//

/** Per-target parallelism across selected teams. */
const TEAM_CONCURRENCY = 2;

//
// Foreign-key + lookup helpers
//

const fkFor = (id: string) => ({ source: LINEAR_SOURCE, id });

/**
 * Generic foreign-key lookup. Schema is forwarded to `Filter.foreignKeys`
 * untyped — the caller supplies the result type via the explicit `T` parameter.
 */
const findByForeignId = <T>(schema: Schema.Schema<any, any>, id: string) =>
  Effect.gen(function* () {
    const results = yield* Database.runQuery(Query.select(Filter.foreignKeys(schema as never, [fkFor(id)])));
    return results.length > 0 ? (results[0] as T) : undefined;
  });

const sinceFromOptions = (options: LinearOperation.SyncOptions | undefined): string | undefined => {
  const days = options?.maxDaysBack;
  if (typeof days !== 'number' || days <= 0) {
    return undefined;
  }
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
};

//
// Upsert helpers (all pull-only)
//

const upsertProject = Effect.fn('upsertProject')(function* (project: LinearApi.Project) {
  const existing = yield* findByForeignId<Project.Project>(Project.Project, project.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      existing.name = project.name;
      if (project.description != null) {
        existing.description = project.description;
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
 * Pull-only upsert for a Linear issue → Task. Mapped fields (title,
 * description, status, priority, estimate) are overwritten by remote on every
 * sync; non-mapped fields are preserved. The Task → Project ref is wired on
 * create and refreshed if the issue's project changes.
 */
const upsertTask = Effect.fn('upsertTask')(function* (issue: LinearApi.Issue, project: Project.Project | undefined) {
  const status = LinearApi.stateTypeToTaskStatus(issue.state.type);
  const priority = LinearApi.priorityNumberToTaskPriority(issue.priority);

  const existing = yield* findByForeignId<Task.Task>(Task.Task, issue.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      existing.title = issue.title;
      existing.description = issue.description ?? '';
      existing.status = status;
      if (priority !== undefined) {
        existing.priority = priority;
      }
      if (issue.estimate != null) {
        existing.estimate = issue.estimate;
      }
      if (project) {
        const currentProjectId = existing.project?.dxn.asEchoDXN()?.echoId;
        const projectId = Ref.make(project).dxn.asEchoDXN()?.echoId;
        if (!existing.project || (currentProjectId && projectId && currentProjectId !== projectId)) {
          existing.project = Ref.make(project);
        }
      }
    });
    return { task: existing, created: false };
  }

  const created = Task.make({
    [Obj.Meta]: { keys: [fkFor(issue.id)] },
    title: issue.title,
    description: issue.description ?? '',
    status,
    priority,
    estimate: issue.estimate ?? undefined,
    project: project ? Ref.make(project) : undefined,
  });
  const persisted = yield* Database.add(created);
  return { task: persisted, created: true };
});

//
// Main handler
//

const handler: Operation.WithHandler<typeof LinearOperation.SyncLinearTeams> = LinearOperation.SyncLinearTeams.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration, team: teamRef }) {
      // TODO(wittjosiah): The operation should depend on `Database.Service` once
      //   the OperationInvoker has a `databaseResolver`. Until then we require
      //   the caller to preload `integration.target` so we can derive the db.
      const integrationTarget = integration.target;
      const db = integrationTarget ? Obj.getDatabase(integrationTarget) : undefined;
      if (!db) {
        return yield* Effect.dieMessage('Integration ref must be preloaded by caller (no database derivable).');
      }

      const integrationId = integration.dxn.asEchoDXN()?.echoId ?? 'unknown';
      const toastIdSuffix = teamRef
        ? `${integrationId}.${teamRef.dxn.asEchoDXN()?.echoId ?? 'unknown'}`
        : integrationId;

      const outcome = yield* Effect.either(
        Effect.gen(function* () {
          const integrationObj = yield* Database.load(integration);

          // Fetch all teams visible to the token once so each target row can
          // resolve its remote `Team`. Targets store the team UUID as
          // `remoteId`.
          const allTeams = yield* LinearApi.fetchTeams();
          const teamsById = new Map(allTeams.map((team) => [team.id, team]));

          // Optional narrow filter to a single target by its local
          // `target.object` echo id. Linear targets don't always have a
          // materialized object until first sync, so this filter is best-effort.
          const teamFilterEchoId = teamRef?.dxn.asEchoDXN()?.echoId;

          type TargetEntry = {
            entry: (typeof integrationObj.targets)[number];
            remoteTeam: LinearApi.Team;
            remoteId: string;
            options: LinearOperation.SyncOptions | undefined;
          };
          const targetEntries: TargetEntry[] = [];
          /** Targets with a foreignId the integration token can't resolve — surfaced via lastError. */
          const inaccessibleRemoteIds: string[] = [];
          for (const target of integrationObj.targets) {
            const remoteId = target.remoteId;
            if (!remoteId) {
              continue;
            }
            const remoteTeam = teamsById.get(remoteId);
            if (!remoteTeam) {
              inaccessibleRemoteIds.push(remoteId);
              continue;
            }
            if (teamFilterEchoId) {
              const targetEchoId = target.object?.dxn.asEchoDXN()?.echoId;
              if (targetEchoId !== teamFilterEchoId) {
                continue;
              }
            }
            targetEntries.push({
              entry: target,
              remoteTeam,
              remoteId,
              options: (target.options ?? undefined) as LinearOperation.SyncOptions | undefined,
            });
          }

          let pulledProjects = 0;
          let pulledTasks = 0;

          const perTarget = yield* Effect.forEach(
            targetEntries,
            ({ remoteTeam, remoteId, options }) =>
              Effect.gen(function* () {
                const result = yield* Effect.either(
                  Effect.gen(function* () {
                    // Projects → DXOS Projects.
                    const projects = yield* LinearApi.fetchTeamProjects(remoteTeam.id);
                    const projectByRemoteId = new Map<string, Project.Project>();
                    for (const project of projects) {
                      const local = yield* upsertProject(project);
                      projectByRemoteId.set(project.id, local);
                      pulledProjects++;
                    }

                    // Issues → DXOS Tasks.
                    const since = sinceFromOptions(options);
                    const issues = yield* LinearApi.fetchTeamIssues(remoteTeam.id, { since });
                    for (const issue of issues) {
                      const project = issue.project ? projectByRemoteId.get(issue.project.id) : undefined;
                      const { created } = yield* upsertTask(issue, project);
                      if (created) {
                        pulledTasks++;
                      }
                    }

                    // TODO(wittjosiah): Comments sync disabled — re-enable
                    // once chunked/yielded to avoid automerge_wasm crash
                    // when upserting many comments in one tick.
                  }),
                );
                return { remoteId, result };
              }),
            { concurrency: TEAM_CONCURRENCY },
          );

          // Apply all `integrationObj.targets` mutations serially after the
          // parallel forEach so concurrent fibers don't race on the same array.
          Obj.update(integrationObj, (integrationObj) => {
            for (const { remoteId, result } of perTarget) {
              const idx = integrationObj.targets.findIndex((target) => target.remoteId === remoteId);
              if (idx < 0) {
                continue;
              }
              if (result._tag === 'Right') {
                integrationObj.targets[idx].lastSyncAt = new Date().toISOString();
                integrationObj.targets[idx].lastError = undefined;
              } else {
                integrationObj.targets[idx].lastError = formatLinearSyncFailure(result.left);
              }
            }
            for (const remoteId of inaccessibleRemoteIds) {
              const idx = integrationObj.targets.findIndex((target) => target.remoteId === remoteId);
              if (idx >= 0) {
                integrationObj.targets[idx].lastError = 'Team not accessible to integration token';
              }
            }
          });

          for (const { result } of perTarget) {
            if (result._tag === 'Left') {
              log.warn('linear sync: target failed', { error: result.left });
            }
          }

          return {
            pulled: {
              teams: targetEntries.length,
              projects: pulledProjects,
              tasks: pulledTasks,
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
