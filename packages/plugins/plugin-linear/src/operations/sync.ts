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
import { Project, Task } from '@dxos/types';

import { meta } from '#meta';

import { LINEAR_SOURCE } from '../constants';
import { formatLinearSyncFailure } from '../errors';
import { LinearApi } from '../services';
import { LinearOperation } from '../types';

//
// Direction: bidirectional (pull-then-push) for projects and tasks.
//
// On each sync pass we first pull every project + issue Linear can see into
// ECHO, then walk the local objects we've synced and push any field that
// diverged from the snapshot taken at the end of the previous pull. The
// snapshot lives on `Integration.snapshots[<linear id>]` and is refreshed at
// every pull and successful push so subsequent passes know exactly which
// fields the user touched locally.
//
// Mapped fields per object:
//   Project: name, description
//   Task:    title, description, status, priority, estimate
//
// Conflict policy is remote-wins (mirrors Trello). People are NOT synced and
// `Task.assigned` is left untouched. Comments are NOT synced (see plugin-github
// for the chunking-required reason — same constraint applies here).
//
// New local objects (no Linear foreign key) are NOT pushed in this pass —
// creating a Linear issue requires a target team and creating a project
// requires a target team plus a state, and we don't currently surface either
// at the call site. Update-only push covers the round-trip flow where the
// user edits a synced item locally.
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
// Snapshot field shapes (stored on `Integration.snapshots`)
//

/**
 * Snapshot shapes. Fields are typed `required` (not `?`) because every
 * snapshot is written in one shot via {@link writeSnapshot} after a pull;
 * the absence-of-snapshot case is modeled by `readSnapshot` returning
 * `undefined`, not by partially-populated objects. `priority` and `estimate`
 * carry `undefined` as a valid recorded value ("no priority", "no estimate").
 */
type ProjectSnapshot = {
  name: string;
  description: string;
};

type TaskSnapshot = {
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent' | undefined;
  estimate: number | undefined;
};

//
// Foreign-key + lookup helpers
//

const fkFor = (id: string) => ({ source: LINEAR_SOURCE, id });

/**
 * Generic foreign-key lookup. Type is forwarded to `Filter.foreignKeys`
 * untyped — the caller supplies the result type via the explicit `T` parameter.
 */
const findByForeignId = <T>(type: Type.AnyEntity, id: string) =>
  Effect.gen(function* () {
    const results = yield* Database.query(Query.select(Filter.foreignKeys(type as never, [fkFor(id)]))).run;
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
// Pull (snapshot-driven three-way merge)
//

/**
 * Pull a Linear project into ECHO. Mapped fields (`name`, `description`) go
 * through three-way merge against the snapshot at `integration.snapshots[id]`,
 * then the snapshot is refreshed to remote-current so the next push knows
 * exactly which fields the user has edited locally. Non-mapped fields
 * (`Project.image`, etc.) are preserved.
 */
export const upsertProject = Effect.fn('upsertProject')(function* (
  integration: Obj.Unknown & { snapshots?: Record<string, unknown> },
  remote: LinearApi.Project,
) {
  const remoteFields: Required<ProjectSnapshot> = {
    name: remote.name,
    description: remote.description ?? '',
  };
  const existing = yield* findByForeignId<Project.Project>(Project.Project, remote.id);

  if (existing) {
    const snapshot = readSnapshot<ProjectSnapshot>(integration, remote.id);
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
    writeSnapshot(integration, remote.id, remoteFields);
    return { project: existing, created: false };
  }

  const created = Obj.make(Project.Project, {
    [Obj.Meta]: { keys: [fkFor(remote.id)] },
    name: remote.name,
    description: remote.description ?? undefined,
  });
  const persisted = yield* Database.add(created);
  writeSnapshot(integration, remote.id, remoteFields);
  return { project: persisted, created: true };
});

/**
 * Pull a Linear issue into ECHO as a Task. Same merge shape as
 * {@link upsertProject}, against snapshot fields {title, description, status,
 * priority, estimate}. The Task → Project ref is wired on create and
 * refreshed if the issue's project changes; assignees are intentionally not
 * synced.
 */
export const upsertTask = Effect.fn('upsertTask')(function* (
  integration: Obj.Unknown & { snapshots?: Record<string, unknown> },
  issue: LinearApi.Issue,
  project: Project.Project | undefined,
) {
  const status = LinearApi.stateTypeToTaskStatus(issue.state.type);
  const priority = LinearApi.priorityNumberToTaskPriority(issue.priority);
  // No explicit annotation: TS infers each property at its exact type
  // (`title: string`, etc.). Annotating as TaskSnapshot would widen
  // `title` to `string | undefined` and break the `mergeField<string>`
  // call below, since Task.title is required.
  const remoteFields = {
    title: issue.title,
    description: issue.description ?? '',
    status,
    priority,
    estimate: issue.estimate ?? undefined,
  };

  const existing = yield* findByForeignId<Task.Task>(Task.Task, issue.id);

  if (existing) {
    const snapshot = readSnapshot<TaskSnapshot>(integration, issue.id);
    // Task.title is required (non-optional), so widen the merge to plain string.
    const titleResult = mergeField<string>(existing.title, remoteFields.title, snapshotField(snapshot, 'title'));
    const descriptionResult = mergeField<string | undefined>(
      existing.description,
      remoteFields.description,
      snapshotField(snapshot, 'description'),
    );
    // Task.status is optional on the schema (may be `undefined` locally), but
    // every snapshot writes a concrete status — so widen to include undefined
    // for the local side while the snapshot side stays narrow.
    const statusResult = mergeField<TaskSnapshot['status'] | undefined>(
      existing.status,
      remoteFields.status,
      snapshotField(snapshot, 'status'),
    );
    // Linear's reverse mapper drops `0` (no priority) → undefined, so the
    // remote/snapshot side never holds 'none'. Widen to the full Task priority
    // union so a locally-set 'none' typechecks too.
    const priorityResult = mergeField<'none' | 'low' | 'medium' | 'high' | 'urgent' | undefined>(
      existing.priority,
      remoteFields.priority,
      snapshotField(snapshot, 'priority'),
    );
    const estimateResult = mergeField<number | undefined>(
      existing.estimate,
      remoteFields.estimate,
      snapshotField(snapshot, 'estimate'),
    );
    const writeTitle = titleResult.source === 'remote' && existing.title !== titleResult.value;
    const writeDescription = descriptionResult.source === 'remote' && existing.description !== descriptionResult.value;
    const writeStatus = statusResult.source === 'remote' && existing.status !== statusResult.value;
    const writePriority = priorityResult.source === 'remote' && existing.priority !== priorityResult.value;
    const writeEstimate = estimateResult.source === 'remote' && existing.estimate !== estimateResult.value;
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
      if (writePriority) {
        existing.priority = priorityResult.value;
      }
      if (writeEstimate) {
        existing.estimate = estimateResult.value;
      }
      if (project) {
        const currentProjectId = existing.project ? EID.getEntityId(EID.tryParse(existing.project.uri)!) : undefined;
        const projectId = EID.getEntityId(EID.tryParse(Ref.make(project).uri)!);
        if (!existing.project || (currentProjectId && projectId && currentProjectId !== projectId)) {
          existing.project = Ref.make(project);
        }
      }
    });
    writeSnapshot(integration, issue.id, remoteFields);
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
  writeSnapshot(integration, issue.id, remoteFields);
  return { task: persisted, created: true };
});

//
// Push (snapshot diff → Linear mutations)
//

/** Result of one push pass over a single team's local-mirror objects. */
export type LinearPushResult = {
  projects: number;
  tasks: number;
};

/**
 * Push reconciler. For every Project/Task carrying a `LINEAR_SOURCE` foreign
 * key, diff its mapped fields against the snapshot in
 * `integration.snapshots[<id>]` and PATCH only the diverged fields back to
 * Linear via `LinearApi.updateProject` / `updateIssue`.
 *
 * Tombstones (`Obj.isDeleted`) are skipped — Linear's `archived` lifecycle is
 * one-way (we treat archived-on-Linear as "still present for sync", not as
 * "should be deleted locally"), so the inverse direction is also a no-op.
 *
 * After a successful push we refresh the snapshot to the values just sent, so
 * the next pass sees no divergence even before the next pull confirms it.
 *
 * `stateIdByTeamMember` resolves a Task `status` to a Linear workflow-state
 * id for the issue's team. Status changes are only pushed when we have a
 * mapping (otherwise the push silently skips status — better than failing
 * the whole pass over an unrecognised workflow).
 *
 * The push callbacks' error type is generic. The reconciler doesn't inspect
 * or recover from those errors — it propagates so the outer `Effect.either`
 * at the call site can record a per-target `lastError`. Generic-`E` keeps
 * this module decoupled from the GraphQL error hierarchy of `LinearApi`.
 */
export const pushTeamUpdates: <E, R>(
  integration: Obj.Unknown & { snapshots?: Record<string, unknown> },
  remoteIssuesById: ReadonlyMap<string, LinearApi.Issue>,
  remoteProjectsById: ReadonlyMap<string, LinearApi.Project>,
  push: {
    /** Wraps `LinearApi.updateProject`. */
    updateProject: (id: string, input: LinearApi.ProjectUpdateInput) => Effect.Effect<void, E, R>;
    /** Wraps `LinearApi.updateIssue`. */
    updateIssue: (id: string, input: LinearApi.IssueUpdateInput) => Effect.Effect<void, E, R>;
    /** Resolve a desired Task status → Linear workflow-state id. Returns undefined when no mapping is known. */
    resolveStateId: (issue: LinearApi.Issue, status: 'todo' | 'in-progress' | 'done') => string | undefined;
  },
) => Effect.Effect<LinearPushResult, E, Database.Service | R> = Effect.fn('pushTeamUpdates')(
  function* (integration, remoteIssuesById, remoteProjectsById, push) {
    let projects = 0;
    let tasks = 0;

    // Iterate all locally-known objects with a Linear foreign key. We re-query
    // by-foreign-key for each remote id rather than walking every Project/Task
    // in the database — both yield the same set, and the by-fid query keeps
    // memory bounded for spaces with thousands of unrelated tasks.
    for (const [id] of remoteProjectsById) {
      const local = yield* findByForeignId<Project.Project>(Project.Project, id);
      if (!local || Obj.isDeleted(local)) {
        continue;
      }
      const snapshot = readSnapshot<ProjectSnapshot>(integration, id);
      if (!snapshot) {
        continue;
      }
      const localName = local.name ?? '';
      const localDescription = local.description ?? '';
      const input: LinearApi.ProjectUpdateInput = {};
      let diverged = false;
      if (snapshot.name !== undefined && snapshot.name !== localName) {
        input.name = localName;
        diverged = true;
      }
      if (snapshot.description !== undefined && snapshot.description !== localDescription) {
        input.description = localDescription;
        diverged = true;
      }
      if (!diverged) {
        continue;
      }
      yield* push.updateProject(id, input);
      writeSnapshot(integration, id, {
        ...snapshot,
        name: localName,
        description: localDescription,
      });
      projects++;
    }

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
      const localPriority = local.priority;
      const localEstimate = local.estimate;

      const input: LinearApi.IssueUpdateInput = {};
      let diverged = false;
      if (snapshot.title !== undefined && snapshot.title !== localTitle) {
        input.title = localTitle;
        diverged = true;
      }
      if (snapshot.description !== undefined && snapshot.description !== localDescription) {
        input.description = localDescription;
        diverged = true;
      }
      if (snapshot.status !== undefined && localStatus !== undefined && snapshot.status !== localStatus) {
        const stateId = push.resolveStateId(remoteIssue, localStatus);
        if (stateId) {
          input.stateId = stateId;
          diverged = true;
        } else {
          log.warn('linear push: no workflow state mapping for status; skipping status push', {
            issueId: id,
            status: localStatus,
          });
        }
      }
      if (snapshot.priority !== localPriority) {
        // Unlike title/description/status, `undefined` is a meaningful value
        // for priority on both sides ("no priority"). We compare by value
        // only — gating on `snapshot.priority !== undefined` would silently
        // drop pushes when the user assigns priority to a previously-empty
        // issue.
        //
        // Send `null` to clear (Linear treats null distinctly from undefined),
        // otherwise the 1..4 numeric form.
        input.priority = LinearApi.taskPriorityToPriorityNumber(localPriority) ?? null;
        diverged = true;
      }
      if (snapshot.estimate !== localEstimate) {
        // Send `null` when the user cleared the estimate locally; Linear
        // treats explicit `null` as a clear (undefined would leave it
        // unchanged on the remote).
        input.estimate = localEstimate ?? null;
        diverged = true;
      }
      if (!diverged) {
        continue;
      }
      yield* push.updateIssue(id, input);
      writeSnapshot(integration, id, {
        ...snapshot,
        title: localTitle,
        description: localDescription,
        status: localStatus ?? snapshot.status,
        priority: localPriority,
        estimate: localEstimate ?? snapshot.estimate,
      });
      tasks++;
    }

    return { projects, tasks };
  },
);

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

      const integrationId = EID.getEntityId(EID.tryParse(integration.uri)!) ?? 'unknown';
      const toastIdSuffix = teamRef
        ? `${integrationId}.${EID.getEntityId(EID.tryParse(teamRef.uri)!) ?? 'unknown'}`
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
          const teamFilterEchoId = teamRef ? EID.getEntityId(EID.tryParse(teamRef.uri)!) : undefined;

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
              const targetEchoId = target.object ? EID.getEntityId(EID.tryParse(target.object.uri)!) : undefined;
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
          let pushedProjects = 0;
          let pushedTasks = 0;

          const perTarget = yield* Effect.forEach(
            targetEntries,
            ({ remoteTeam, remoteId, options }) =>
              Effect.gen(function* () {
                const result = yield* Effect.either(
                  Effect.gen(function* () {
                    // Pull: projects → DXOS Projects, issues → DXOS Tasks.
                    // Each upsert refreshes `integration.snapshots[<id>]` to
                    // remote-current so the push pass below sees only
                    // fields the user has edited locally since the last pull.
                    const projects = yield* LinearApi.fetchTeamProjects(remoteTeam.id);
                    const projectByRemoteId = new Map<string, Project.Project>();
                    const remoteProjectsById = new Map<string, LinearApi.Project>();
                    for (const project of projects) {
                      const { project: local, created } = yield* upsertProject(integrationObj, project);
                      projectByRemoteId.set(project.id, local);
                      remoteProjectsById.set(project.id, project);
                      if (created) {
                        pulledProjects++;
                      }
                    }

                    const since = sinceFromOptions(options);
                    const issues = yield* LinearApi.fetchTeamIssues(remoteTeam.id, { since });
                    const remoteIssuesById = new Map<string, LinearApi.Issue>();
                    for (const issue of issues) {
                      const project = issue.project ? projectByRemoteId.get(issue.project.id) : undefined;
                      const { created } = yield* upsertTask(integrationObj, issue, project);
                      remoteIssuesById.set(issue.id, issue);
                      if (created) {
                        pulledTasks++;
                      }
                    }

                    // Push: snapshot-diff every locally-mirrored object back
                    // to Linear. Workflow states are fetched lazily — only
                    // when at least one local Task status diverged — so
                    // read-only syncs don't pay the round-trip.
                    let workflowStates: ReadonlyArray<LinearApi.WorkflowState> | undefined;
                    const resolveStateId = (issue: LinearApi.Issue, status: 'todo' | 'in-progress' | 'done') => {
                      const desiredType = LinearApi.taskStatusToStateType(status);
                      const states = workflowStates;
                      if (!states) {
                        return undefined;
                      }
                      // Match by category. Workspaces commonly have multiple
                      // states per category (e.g. "In Review" + "In Progress"
                      // both `started`); pick the first match for stability.
                      return states.find((s) => s.type === desiredType)?.id;
                    };

                    // Lazy fetch: we only need workflow states if there are
                    // candidate issues to push. By this point `upsertTask`
                    // above has seeded a snapshot for every id in
                    // `remoteIssuesById`, so the existence of issues is
                    // equivalent to "at least one candidate" — a stronger
                    // pre-check (e.g. checking for divergent local status)
                    // would need a synchronous DB read per id and isn't
                    // worth the complexity for a single round-trip.
                    if (remoteIssuesById.size > 0) {
                      workflowStates = yield* LinearApi.fetchTeamWorkflowStates(remoteTeam.id);
                    }

                    const pushResult = yield* pushTeamUpdates(integrationObj, remoteIssuesById, remoteProjectsById, {
                      updateProject: (id, input) => LinearApi.updateProject(id, input),
                      updateIssue: (id, input) => LinearApi.updateIssue(id, input),
                      resolveStateId,
                    });
                    pushedProjects += pushResult.projects;
                    pushedTasks += pushResult.tasks;

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
            pushed: {
              projects: pushedProjects,
              tasks: pushedTasks,
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
            id: `${meta.profile.key}.sync-success.${toastIdSuffix}`,
            icon: 'ph--check--regular',
            title: ['sync-toast.success.label', { ns: meta.profile.key }],
          }),
        );
        return outcome.right;
      } else {
        const message = formatLinearSyncFailure(outcome.left);
        yield* Effect.ignore(
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.profile.key}.sync-error.${toastIdSuffix}`,
            icon: 'ph--warning--regular',
            title: ['sync-toast.error.label', { ns: meta.profile.key }],
            description: message,
          }),
        );
        return yield* Effect.fail(outcome.left);
      }
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
