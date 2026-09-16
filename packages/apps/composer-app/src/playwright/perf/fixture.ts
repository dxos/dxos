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
  elapsedMs: number;
};

/**
 * Carried by roughly a tenth of titles, so the set is not uniform.
 *
 * Render realism rather than a filter target: rows whose titles are all the same length and shape
 * let text measurement and memoization behave in a way a real set would not.
 */
const TITLE_VARIANT = 'zephyr';

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
    async ({ tasks, depth, projects, runId, titleVariant, concurrency }) => {
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
       * A hydrated ref to an object id.
       *
       * `db.makeRef` rather than `Ref.fromURI`, which `Database.makeRef`'s own docs call out: the
       * latter returns an UNHYDRATED reference whose `.load`/`.target` do not work, so a handler
       * that resolves what it is handed fails with `Resolver is not set`. A reconstructed
       * `{ '/': … }` envelope does not work either — the input schema wants an instance
       * (`Expected <Declaration>`). This is the bridge between operations that CREATE an object
       * (returning a JSON snapshot) and those that CONSUME one (taking a `Ref`).
       */
      const refFor = (id: string): unknown => {
        const space = globalThis.dxos?.spaces?.().find((candidate) => candidate.id === spaceId);
        if (!space) {
          throw new Error(`space ${spaceId} is not in the client's space list`);
        }
        return space.db.makeRef(`echo:///${id}`);
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
        milestonesPerSet.push(createdIds.map(refFor));
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
                    ? `Task ${ordinal} ${titleVariant} calibration`
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
          parents = level + 1 < depth ? levelIds.map(refFor) : [];
        }
      }

      return { spaceId, projectIds, taskCount, elapsedMs: Date.now() - started };
    },
    { ...scale, runId, titleVariant: TITLE_VARIANT, concurrency: CONCURRENCY },
  );
