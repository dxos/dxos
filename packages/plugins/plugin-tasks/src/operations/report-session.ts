//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Hypergraph, Obj, Query } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';
import { RemoteSession, Task } from '@dxos/types';

import { RemoteSessionOperation } from '#types';

/**
 * What a caller is told when the session is not registered anywhere and named no space.
 *
 * Not an error: the hook's payload is fixed, so a first report legitimately cannot say where the
 * session belongs. The model reading this result is the one that can, and it is the only party in
 * the loop that knows which space the work is being tracked in.
 */
const NEEDS_SPACE = (sessionId: string) =>
  'This session is not recorded in any space and no spaceId was given, so nothing was written. ' +
  'Call it again with the space this work is tracked in:\n\n' +
  `  RecordSession({ spaceId: "<assigned space>", sessionId: "${sessionId}", title: "<short title ` +
  'for this run>", summary: "<one sentence on where the work stands>" })\n\n' +
  'The project skill resolves the assigned space from the repo binding, and `whoami` lists the ' +
  'spaces available. Once recorded, later reports find the session on their own and need no spaceId.';

/**
 * Asked for when the session has no title, or has gone quiet long enough that `state` stopped
 * describing it. Names the arguments verbatim: a caller told to "add a title" writes prose about
 * adding one, while a caller shown the call makes it.
 */
const NEEDS_PROSE = (sessionId: string, missingTitle: boolean, stale: boolean) =>
  `This session ${
    missingTitle && stale
      ? 'has no title and has not checked in for a while'
      : missingTitle
        ? 'has no title'
        : 'has not checked in for a while'
  }. Call it again to say what it is doing:\n\n` +
  `  RecordSession({ sessionId: "${sessionId}"${missingTitle ? ', title: "<short title for this run>"' : ''}` +
  ', summary: "<one sentence on where the work stands>" })';

/** Appended when the session owns open tasks, so the reminder says what to do with them. */
const TASKS_NOTE =
  'These are the open tasks assigned to this session. Use `tasks-list` or `space-query-objects` ' +
  'with a task DXN to read one in full.';

/**
 * Every row for this session, across every space the graph spans.
 *
 * Sorted by id so a tie converges: nothing constrains uniqueness, so two hooks firing their first
 * report at once both see no row and both create one. Oldest id wins and the rest are folded in
 * and removed below.
 */
const findAll = (graph: Hypergraph.Hypergraph, sessionId: string) =>
  Effect.promise(() =>
    graph
      .query(
        Query.select(Filter.foreignKeys(RemoteSession.RemoteSession, [RemoteSession.key(sessionId)])).from(
          'all-accessible-spaces',
        ),
      )
      .run(),
  ).pipe(Effect.map((result) => [...result].sort((left, right) => left.id.localeCompare(right.id))));

/**
 * The object's own id, from either URI form.
 *
 * A ref made against the object's own database carries the relative `echo:///<id>`, while
 * `Obj.getURI` always answers the absolute `echo://<space>/<id>` — comparing them as strings finds
 * nothing, which is the whole bug this exists to avoid.
 */
const objectId = (uri: string | undefined): string | undefined => uri?.split('/').filter(Boolean).at(-1);

/** Statuses that mean the work is over; a reminder listing them would be noise. */
const CLOSED: ReadonlySet<string> = new Set(['done', 'duplicate', 'cancelled', 'failed']);

/**
 * The open tasks whose assignee stands for this session.
 *
 * Filtered in memory rather than in the query: `assignee` is an inline actor, not a relation, so
 * there is no edge to select on — the subject ref is a field of a struct on the task.
 */
const assignedTasks = (graph: Hypergraph.Hypergraph, session: RemoteSession.RemoteSession) =>
  Effect.promise(() => graph.query(Query.select(Filter.type(Task.Task)).from('all-accessible-spaces')).run()).pipe(
    Effect.map((result) =>
      [...result]
        .filter((task) => objectId(task.assignee?.subject?.uri) === objectId(Obj.getURI(session)))
        .filter((task) => !CLOSED.has(task.status ?? ''))
        .map((task) => {
          // Containment, not a lookup: `TaskSet.tasks` and `Project.taskSet` both set parent, so the
          // project is two hops up from any task filed in one.
          const taskSet = Obj.getParent(task);
          const project = taskSet && Obj.getParent(taskSet);
          return {
            title: task.title,
            dxn: Obj.getURI(task).toString(),
            status: task.status,
            project: project && Obj.getLabel(project),
            projectDxn: project && Obj.getURI(project).toString(),
          };
        }),
    ),
  );

/**
 * What a successful report hands back: the tasks it owns, and a nudge when the session cannot yet
 * say what it is doing. Staleness is measured BEFORE this call stamps `lastCheckedIn`, or every
 * report would look fresh to itself.
 */
const reminder = Effect.fn(function* (
  graph: Hypergraph.Hypergraph,
  session: RemoteSession.RemoteSession,
  wasStale: boolean,
) {
  const tasks = yield* assignedTasks(graph, session);
  const missingTitle = !session.title;
  const instructions = [
    missingTitle || wasStale
      ? NEEDS_PROSE(RemoteSession.getSessionId(session) ?? '', missingTitle, wasStale)
      : undefined,
    tasks.length > 0 ? TASKS_NOTE : undefined,
  ]
    .filter((line) => line !== undefined)
    .join('\n\n');

  return {
    ...(tasks.length > 0 ? { tasks } : {}),
    ...(instructions.length > 0 ? { instructions } : {}),
  };
});

const handler: Operation.WithHandler<typeof RemoteSessionOperation.RecordSession> =
  RemoteSessionOperation.RecordSession.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ sessionId, spaceId, title, state, lastMessage, summary, repo, branch, worktree }) {
        const { graph } = yield* Hypergraph.Service;
        const now = new Date().toISOString();

        // The graph spans every space, so the session is found wherever it was first registered —
        // which is the whole point: a hook cannot name a space, but it can be told where the
        // session already lives.
        const matches = yield* findAll(graph, sessionId);
        const [existing, ...duplicates] = matches;

        if (!existing) {
          // Nothing to update. Without a space there is nowhere to put it either, so report back
          // rather than guessing one — the outcome worse than not recording the session at all.
          if (!spaceId) {
            return { sessionId, created: false, instructions: NEEDS_SPACE(sessionId) };
          }
          if (!SpaceId.isValid(spaceId)) {
            return { sessionId, created: false, instructions: `Not a valid spaceId: ${spaceId}.` };
          }
          const db = graph.getDatabase(spaceId);
          if (!db) {
            return { sessionId, created: false, instructions: `No such space: ${spaceId}.` };
          }
          const session = db.add(
            RemoteSession.make({
              sessionId,
              title,
              state: state ?? 'running',
              lastMessage,
              summary,
              started: now,
              lastCheckedIn: now,
              ...(state && state !== 'running' ? { finished: now } : {}),
              repo,
              branch,
              worktree,
            }),
          );
          yield* Effect.promise(() => db.flush());
          // A session created by this call has never checked in before, so it is not stale — only
          // a missing title can ask for prose here.
          return { session, sessionId, created: true, ...(yield* reminder(graph, session, false)) };
        }

        // Read before either update below stamps `lastCheckedIn`, which would otherwise make every
        // report look freshly seen to itself.
        const wasStale = RemoteSession.isStale(existing);

        // Written back through the database that actually holds the survivor, which is not
        // necessarily the one the caller named.
        const db: Database.Database | undefined = Obj.getDatabase(existing);

        // Duplicates carry history, not noise: each was found by some writer and took its own
        // updates, so one can hold the end of the session while the survivor still reads running.
        // Their content is folded in before they are removed, and the incoming patch is applied
        // after, so the newest report still wins where it says anything.
        Obj.update(existing, (existing) => {
          for (const duplicate of duplicates) {
            existing.title ??= duplicate.title;
            existing.repo ??= duplicate.repo;
            existing.branch ??= duplicate.branch;
            existing.worktree ??= duplicate.worktree;
            // Latest check-in wins for the prose and the heartbeat, since both describe a moment.
            if (duplicate.lastCheckedIn !== undefined && duplicate.lastCheckedIn > (existing.lastCheckedIn ?? '')) {
              existing.lastMessage = duplicate.lastMessage ?? existing.lastMessage;
              existing.lastCheckedIn = duplicate.lastCheckedIn;
            }
            // Earliest start, because the session began when the first of these rows says it did.
            if (duplicate.started < existing.started) {
              existing.started = duplicate.started;
            }
            // An end recorded anywhere is the end: a terminal state must survive the merge, or
            // deleting the row that carried it would leave a finished session reading running.
            if (RemoteSession.isTerminal(duplicate) && !RemoteSession.isTerminal(existing)) {
              existing.state = duplicate.state;
              existing.finished = duplicate.finished;
            }
          }
        });

        // Every field is patched only when supplied: a hook bound to one event reports the two or
        // three things that event knows, and must not blank what another event wrote.
        Obj.update(existing, (existing) => {
          if (title !== undefined) {
            existing.title = title;
          }
          if (lastMessage !== undefined) {
            existing.lastMessage = lastMessage;
          }
          if (summary !== undefined) {
            existing.summary = summary;
          }
          if (repo !== undefined) {
            existing.repo = repo;
          }
          if (branch !== undefined) {
            existing.branch = branch;
          }
          if (worktree !== undefined) {
            existing.worktree = worktree;
          }
          // A terminal session keeps its state. Reports keep arriving after one ends — a queued
          // hook, a resumed transcript — and letting `running` win would leave a finished session
          // looking live, contradicting the `finished` time it still carries.
          if (state !== undefined && !RemoteSession.isTerminal(existing)) {
            existing.state = state;
            // Stamped once, on the transition: a later report on an already-finished session is a
            // check-in, and must not move the time the work actually ended.
            if (state !== 'running' && existing.finished === undefined) {
              existing.finished = now;
            }
          }
          existing.lastCheckedIn = now;
        });

        // The duplicates this operation could not prevent do not survive the write that finds
        // them: leaving them would report one session twice and split its later updates.
        for (const duplicate of duplicates) {
          db?.remove(duplicate);
        }
        yield* Effect.promise(async () => db?.flush());
        return { session: existing, sessionId, created: false, ...(yield* reminder(graph, existing, wasStale)) };
      }),
    ),
  );

export default handler;
