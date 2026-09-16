//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

import { type SpaceId } from '@dxos/keys';

/** One scale tier of the Projects + Tasks flow. */
export type Scale = {
  /** Total tasks across every project. */
  tasks: number;
  /** Hierarchy depth; 1 means a flat set. */
  depth: number;
  projects: number;
};

export const SCALES: Record<string, Scale> = {
  smoke: { tasks: 200, depth: 2, projects: 1 },
  working: { tasks: 2000, depth: 3, projects: 5 },
  heavy: { tasks: 10_000, depth: 3, projects: 5 },
};

/** The label that groups rows by tier; stable across runs so a trend is joinable. */
export const scaleLabel = ({ tasks, depth, projects }: Scale): string =>
  `tasks=${tasks},depth=${depth},projects=${projects}`;

export type Fixture = {
  spaceId: SpaceId;
  projectIds: string[];
  /** Tasks actually created, which is the figure to report rather than the one asked for. */
  taskCount: number;
  /** A title substring matching roughly a tenth of the tasks, for the filter stage. */
  filterTerm: string;
  elapsedMs: number;
};

/** Roughly a tenth of titles carry it, so the filter stage narrows the list rather than emptying it. */
const FILTER_TERM = 'zephyr';

/** Concurrent `tasks.create` calls per batch, bounding how many writes are in flight at once. */
const CONCURRENCY = 25;

/**
 * Builds the fixture through the app's own operations, in one page evaluation.
 *
 * Operations rather than direct `db.add`, because the write path is what produces a realistic
 * graph: `tasks.create` files each task into the set's `tasks` array — the membership-and-order
 * record a generic object create leaves untouched — and rejects a cross-set parent, so the
 * hierarchy this generates is one the UI can actually render.
 *
 * One evaluation rather than a call per task: each operation is an in-page await, so driving 10k of
 * them from the test process would add 10k round trips to a fixture nobody measures.
 */
export const createProjectsFixture = async (page: Page, scale: Scale, runId: string): Promise<Fixture> =>
  page.evaluate(
    async ({ tasks, depth, projects, runId, filterTerm, concurrency }) => {
      const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null;

      // `SpaceId`'s own predicate lives in `@dxos/keys`, which this evaluation cannot import — the
      // body is serialized into the page. Restated rather than asserted, so an operation is never
      // handed something that merely looks like an id: RFC4648 base-32, multibase 'B' prefix, 33
      // characters (`packages/common/keys/src/space-id.ts`).
      const isSpaceId = (value: unknown): value is SpaceId =>
        typeof value === 'string' && value.startsWith('B') && value.length === 33;

      /**
       * `spaceId` is REQUIRED for anything reaching the database: `Database.Service` has process
       * affinity and its spawn environment takes the space from the invocation options, not from
       * whichever workspace the UI happens to be showing. Without it the handler fails with
       * `ServiceNotAvailable: @dxos/echo/Database/Service`.
       */
      const invoke = async (key: string, input: unknown, spaceId?: SpaceId): Promise<unknown> => {
        const composer = globalThis.composer;
        if (!composer?.invoke) {
          throw new Error('composer.invoke is unavailable — the app has not finished mounting');
        }
        return composer.invoke(key, input, spaceId ? { spaceId } : undefined);
      };

      /** An operation's named output field, or undefined — every output here is a struct. */
      const field = (value: unknown, name: string): unknown => (isRecord(value) ? value[name] : undefined);

      const readId = (value: unknown): string | undefined => {
        const id = field(value, 'id');
        return typeof id === 'string' ? id : undefined;
      };

      /**
       * Refs for a batch of object ids, read back from the database as LIVE objects.
       *
       * Operations that CREATE an object return a JSON snapshot (`{ id, title, … }`) while those
       * that CONSUME one take a `Ref`, so the fixture has to bridge them — and only a ref built
       * from a live object carries the resolver the handler's `tryLoad()` needs. The two
       * shortcuts both fail: a hand-assembled `{ '/': 'echo:///<id>' }` envelope is rejected by the
       * input schema (`Expected <Declaration>`), and a `Ref.fromURI` ref is accepted but resolves
       * to `Resolver is not set`.
       *
       * Batched because `Filter.id` is variadic: one query per level rather than one per task.
       */
      const refsForIds = async (ids: string[]): Promise<unknown[]> => {
        if (ids.length === 0) {
          return [];
        }
        const make = globalThis.dxos?.Ref?.make;
        const filterById = globalThis.dxos?.Filter?.id;
        const listSpaces = globalThis.dxos?.spaces;
        if (!make || !filterById || !listSpaces) {
          throw new Error('the dxos client debug hook is not mounted (Ref/Filter/spaces missing)');
        }
        const space = listSpaces().find((candidate) => candidate.id === spaceId);
        if (!space) {
          throw new Error(`space ${spaceId} is not in the client's space list`);
        }
        const { objects } = await space.db.query(filterById(...ids)).run();
        const byId = new Map(objects.filter(isRecord).map((object) => [String(object.id), object]));
        // Ordered by the caller's ids so a parent assignment is deterministic, and silently short
        // where an object did not come back — a missing parent must not shift the rest.
        return ids.flatMap((id) => {
          const object = byId.get(id);
          return object ? [make(object)] : [];
        });
      };

      const started = Date.now();

      const space = await invoke('org.dxos.operation.space.create', { name: `PERF: Projects ${runId}` });
      // `space.create` returns the space under `space` in some paths and bare in others, so both are
      // read rather than assuming the shape.
      const spaceId = readId(field(space, 'space')) ?? readId(space);
      if (!isSpaceId(spaceId)) {
        throw new Error(`space.create returned no usable id: ${JSON.stringify(space)?.slice(0, 200)}`);
      }

      // `projects.create` and `tasks.create` resolve their database from the ACTIVE space rather
      // than from an input, so the workspace has to move before anything is written.
      await invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` });

      const projectIds: string[] = [];
      const taskSets: unknown[] = [];
      for (let index = 0; index < projects; index++) {
        const result = await invoke(
          'org.dxos.operation.projects.create',
          { name: `Perf project ${index + 1}` },
          spaceId,
        );
        const project = field(result, 'project');
        const taskSet = field(project, 'taskSet');
        const projectId = readId(project);
        if (!taskSet || !projectId) {
          throw new Error(`projects.create returned no taskSet: ${JSON.stringify(result)?.slice(0, 400)}`);
        }
        projectIds.push(projectId);
        // Passed back exactly as the operation returned it — a live `Ref`, which is what the next
        // operation's input schema wants.
        taskSets.push(taskSet);
      }

      const milestonesPerSet: unknown[][] = [];
      for (const taskSet of taskSets) {
        const createdIds: string[] = [];
        for (const name of ['Alpha', 'Beta', 'Gamma']) {
          const result = await invoke('org.dxos.operation.tasks.createMilestone', { taskSet, name }, spaceId);
          const milestoneId = readId(field(result, 'milestone'));
          if (milestoneId) {
            createdIds.push(milestoneId);
          }
        }
        milestonesPerSet.push(await refsForIds(createdIds));
      }

      const perProject = Math.ceil(tasks / projects);
      let taskCount = 0;

      for (let projectIndex = 0; projectIndex < taskSets.length; projectIndex++) {
        const taskSet = taskSets[projectIndex];
        const milestones = milestonesPerSet[projectIndex];

        // Level by level, because a sub-task needs its parent to exist; within a level the creates
        // are independent and run in bounded batches.
        let parents: unknown[] = [];
        let remaining = perProject;
        for (let level = 0; level < depth && remaining > 0; level++) {
          // Half the remaining budget per level, so a depth-3 set is a tree rather than a chain;
          // the last level absorbs whatever is left.
          const levelCount = level === depth - 1 ? remaining : Math.max(1, Math.ceil(remaining / 2));
          const levelIds: string[] = [];

          for (let start = 0; start < levelCount; start += concurrency) {
            const batch: Array<Promise<unknown>> = [];
            for (let offset = 0; offset < concurrency && start + offset < levelCount; offset++) {
              const index = start + offset;
              const ordinal = taskCount + index + 1;
              const input: Record<string, unknown> = {
                taskSet,
                title:
                  ordinal % 10 === 0
                    ? `Task ${ordinal} ${filterTerm} calibration`
                    : `Task ${ordinal} in project ${projectIndex + 1}`,
                description: `Generated task ${ordinal} at level ${level}.`,
              };
              if (parents.length > 0) {
                input.parentTask = parents[index % parents.length];
              }
              // Three in four filed under a milestone, so the backlog grouping is populated too.
              if (milestones.length > 0 && ordinal % 4 !== 0) {
                input.milestone = milestones[ordinal % milestones.length];
              }
              batch.push(invoke('org.dxos.operation.tasks.create', input, spaceId));
            }
            for (const result of await Promise.all(batch)) {
              const taskId = readId(field(result, 'task'));
              if (taskId) {
                levelIds.push(taskId);
              }
            }
          }

          taskCount += levelIds.length;
          remaining -= levelCount;
          // Resolved once per level rather than per task: the ids only become usable parents as
          // live refs, and `Filter.id` takes the whole level in one query.
          parents = level + 1 < depth ? await refsForIds(levelIds) : [];
        }
      }

      return { spaceId, projectIds, taskCount, filterTerm, elapsedMs: Date.now() - started };
    },
    { ...scale, runId, filterTerm: FILTER_TERM, concurrency: CONCURRENCY },
  );
