//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { ConnectorSync, LayoutOperation } from '@dxos/app-toolkit';

const { mergeField, readSnapshot, snapshotField, writeSnapshot } = ConnectorSync;
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { Cursor, Project, SyncBinding, Task } from '@dxos/types';

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
// snapshot lives on `SyncBinding.snapshots[<linear id>]` and is refreshed at
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
// Sync target shape: the user picks Linear TEAMS. Each team is bound via one
// `SyncBinding` whose target is the team's local root Project; the team's
// projects and issues are pulled under it. The user does not pick projects
// directly.
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
// Snapshot field shapes (stored on `SyncBinding.snapshots`)
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
 * through three-way merge against the snapshot at `binding.snapshots[id]`,
 * then the snapshot is refreshed to remote-current so the next push knows
 * exactly which fields the user has edited locally. Non-mapped fields
 * (`Project.image`, etc.) are preserved.
 */
export const upsertProject = Effect.fn('upsertProject')(function* (
  binding: SyncBinding.SyncBinding,
  remote: LinearApi.Project,
) {
  const remoteFields: Required<ProjectSnapshot> = {
    name: remote.name,
    description: remote.description ?? '',
  };
  const existing = yield* findByForeignId<Project.Project>(Project.Project, remote.id);

  if (existing) {
    const snapshot = readSnapshot<ProjectSnapshot>(binding, remote.id);
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
    writeSnapshot(binding, remote.id, remoteFields);
    return { project: existing, created: false };
  }

  const created = Obj.make(Project.Project, {
    [Obj.Meta]: { keys: [fkFor(remote.id)] },
    name: remote.name,
    description: remote.description ?? undefined,
  });
  const persisted = yield* Database.add(created);
  writeSnapshot(binding, remote.id, remoteFields);
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
  binding: SyncBinding.SyncBinding,
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
    const snapshot = readSnapshot<TaskSnapshot>(binding, issue.id);
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
    writeSnapshot(binding, issue.id, remoteFields);
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
  writeSnapshot(binding, issue.id, remoteFields);
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
 * `binding.snapshots[<id>]` and PATCH only the diverged fields back to
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
 * at the call site can record the binding's `lastError`. Generic-`E` keeps
 * this module decoupled from the GraphQL error hierarchy of `LinearApi`.
 */
export const pushTeamUpdates: <E, R>(
  binding: SyncBinding.SyncBinding,
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
  function* (binding, remoteIssuesById, remoteProjectsById, push) {
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
      const snapshot = readSnapshot<ProjectSnapshot>(binding, id);
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
      writeSnapshot(binding, id, {
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
      const snapshot = readSnapshot<TaskSnapshot>(binding, id);
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
      writeSnapshot(binding, id, {
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
    Effect.fn(function* ({ binding: bindingRef }) {
      // TODO(wittjosiah): The operation should depend on `Database.Service` once
      //   the OperationInvoker has a `databaseResolver`. Until then we require
      //   the caller to preload `binding.target` so we can derive the db.
      const bindingTarget = bindingRef.target;
      if (!bindingTarget) {
        return yield* Effect.dieMessage('Binding ref must be preloaded by caller (relation not resolved).');
      }
      const db = Obj.getDatabase(bindingTarget);
      if (!db) {
        return yield* Effect.dieMessage('Binding ref must be preloaded by caller (no database derivable).');
      }

      // The binding's source is the Connection that authenticates the sync.
      const connection = Relation.getSource(bindingTarget);

      const bindingId = EID.getEntityId(EID.tryParse(bindingRef.uri)!) ?? 'unknown';
      const toastIdSuffix = bindingId;

      const outcome = yield* Effect.either(
        Effect.gen(function* () {
          const binding = yield* Database.load(bindingRef);
          const cursor = yield* Database.load(binding.cursor);
          const remoteId = binding.remoteId;
          if (!remoteId) {
            return yield* Effect.dieMessage('SyncBinding has no remoteId; cannot resolve a Linear team.');
          }
          // `SyncBinding.options` is an opaque provider-defined record in the
          // shared contract; this connector owns and validates its shape.
          const options = binding.options as LinearOperation.SyncOptions | undefined;

          const syncResult = yield* Effect.either(
            Effect.gen(function* () {
              // Resolve the remote `Team` for this binding's `remoteId`.
              const allTeams = yield* LinearApi.fetchTeams();
              const remoteTeam = allTeams.find((team) => team.id === remoteId);
              if (!remoteTeam) {
                return yield* Effect.fail(new Error('Team not accessible to connection token'));
              }

              // Pull: projects → DXOS Projects, issues → DXOS Tasks. Each
              // upsert refreshes `binding.snapshots[<id>]` to remote-current so
              // the push pass below sees only fields the user has edited
              // locally since the last pull.
              const projects = yield* LinearApi.fetchTeamProjects(remoteTeam.id);
              const projectByRemoteId = new Map<string, Project.Project>();
              const remoteProjectsById = new Map<string, LinearApi.Project>();
              let pulledProjects = 0;
              for (const project of projects) {
                const { project: local, created } = yield* upsertProject(binding, project);
                projectByRemoteId.set(project.id, local);
                remoteProjectsById.set(project.id, project);
                if (created) {
                  pulledProjects++;
                }
              }

              const since = sinceFromOptions(options);
              const issues = yield* LinearApi.fetchTeamIssues(remoteTeam.id, { since });
              const remoteIssuesById = new Map<string, LinearApi.Issue>();
              let pulledTasks = 0;
              for (const issue of issues) {
                const project = issue.project ? projectByRemoteId.get(issue.project.id) : undefined;
                const { created } = yield* upsertTask(binding, issue, project);
                remoteIssuesById.set(issue.id, issue);
                if (created) {
                  pulledTasks++;
                }
              }

              // Push: snapshot-diff every locally-mirrored object back to
              // Linear. Workflow states are fetched lazily — only when at least
              // one local Task status diverged — so read-only syncs don't pay
              // the round-trip.
              let workflowStates: ReadonlyArray<LinearApi.WorkflowState> | undefined;
              const resolveStateId = (issue: LinearApi.Issue, status: 'todo' | 'in-progress' | 'done') => {
                const desiredType = LinearApi.taskStatusToStateType(status);
                const states = workflowStates;
                if (!states) {
                  return undefined;
                }
                // Match by category. Workspaces commonly have multiple states
                // per category (e.g. "In Review" + "In Progress" both
                // `started`); pick the first match for stability.
                return states.find((s) => s.type === desiredType)?.id;
              };

              // Lazy fetch: we only need workflow states if there are candidate
              // issues to push. By this point `upsertTask` above has seeded a
              // snapshot for every id in `remoteIssuesById`, so the existence of
              // issues is equivalent to "at least one candidate".
              if (remoteIssuesById.size > 0) {
                workflowStates = yield* LinearApi.fetchTeamWorkflowStates(remoteTeam.id);
              }

              const pushResult = yield* pushTeamUpdates(binding, remoteIssuesById, remoteProjectsById, {
                updateProject: (id, input) => LinearApi.updateProject(id, input),
                updateIssue: (id, input) => LinearApi.updateIssue(id, input),
                resolveStateId,
              });

              // TODO(wittjosiah): Comments sync disabled — re-enable once
              // chunked/yielded to avoid automerge_wasm crash when upserting
              // many comments in one tick.

              return {
                pulledProjects,
                pulledTasks,
                pushedProjects: pushResult.projects,
                pushedTasks: pushResult.tasks,
              };
            }),
          );

          // Record per-binding sync status on the cursor object.
          if (syncResult._tag === 'Right') {
            Cursor.advance(cursor);
          } else {
            Cursor.recordError(cursor, formatLinearSyncFailure(syncResult.left));
          }

          if (syncResult._tag === 'Left') {
            log.warn('linear sync: binding failed', { error: syncResult.left });
            return yield* Effect.fail(syncResult.left);
          }

          return {
            pulled: {
              teams: 1,
              projects: syncResult.right.pulledProjects,
              tasks: syncResult.right.pulledTasks,
            },
            pushed: {
              projects: syncResult.right.pushedProjects,
              tasks: syncResult.right.pushedTasks,
            },
          };
        }).pipe(
          Effect.provide(Database.layer(db)),
          Effect.provide(LinearApi.LinearCredentials.fromConnection(Ref.make(connection))),
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
