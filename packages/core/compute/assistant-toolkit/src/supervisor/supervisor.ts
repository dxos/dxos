//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import { Operation, Process } from '@dxos/compute';
import { ProcessManager, Supervisor } from '@dxos/compute-runtime';
import { Database, Obj } from '@dxos/echo';

import { Agent, Plan } from '../types';

/**
 * Services available to a supervisor process and its injected callbacks. `Operation.Service` lets
 * `runTurn`/`toChildInput` invoke operations (e.g. run an agent turn or synthesize a routine).
 */
type SupervisorServices = Database.Service | ProcessManager.ProcessOperationInvoker.Service | Operation.Service;

export interface MakeSupervisorOptions<ChildInput, ChildOutput> {
  /**
   * Agent whose plan the supervisor tracks. In-progress tasks are delegated to child processes.
   */
  readonly agent: Agent.Agent;

  /**
   * Operation run by each delegated sub-agent (e.g. AgentPrompt).
   */
  readonly childOperation: Operation.Definition<ChildInput, ChildOutput>;

  /**
   * Handles a user turn. May enqueue work by adding in-progress tasks to the agent's plan (e.g. by
   * running an AiSession turn whose tools call DelegateTask). Errors must be handled by the caller.
   */
  readonly runTurn: (input: string) => Effect.Effect<void, never, SupervisorServices>;

  /**
   * Builds the child operation input for a delegated task. Effectful so it may, for example,
   * synthesize and persist a routine for the sub-agent to run.
   */
  readonly toChildInput: (task: Plan.Task) => Effect.Effect<ChildInput, never, SupervisorServices>;

  /**
   * Invoked when a delegated task completes (after the task status has been updated). Use to notify
   * the user with the result. Errors must be handled by the caller.
   */
  readonly onComplete: (taskId: Plan.TaskId, exit: Exit.Exit<ChildOutput>) => Effect.Effect<void, never, SupervisorServices>;
}

/**
 * Creates a long-lived supervisor process for an agent.
 *
 * On each user input it runs a turn (which may delegate work as in-progress plan tasks), then spawns
 * a child process per newly in-progress task — linked to the supervisor so the child's completion
 * wakes the supervisor's `onChildEvent`. On completion the task status is updated and `onComplete`
 * is invoked. The supervisor never completes, so it keeps accepting user input while children run.
 */
export const makeSupervisor = <ChildInput, ChildOutput>(
  options: MakeSupervisorOptions<ChildInput, ChildOutput>,
): Process.Process<string, void, SupervisorServices> =>
  Process.make(
    {
      key: 'org.dxos.process.supervisor',
      input: Schema.String,
      output: Schema.Void,
      services: [Database.Service, ProcessManager.ProcessOperationInvoker.Service, Operation.Service],
    },
    () =>
      Effect.gen(function* () {
        // Maps a running child process to the task it is fulfilling, and tracks which tasks are
        // already delegated so reconciliation does not double-spawn.
        const taskByPid = new Map<Process.ID, Plan.TaskId>();
        const inFlight = new Set<Plan.TaskId>();

        const loadPlan = Database.load(options.agent.plan).pipe(Effect.orDie);

        const reconcile = Effect.gen(function* () {
          const plan = yield* loadPlan;
          for (const task of plan.tasks) {
            if (task.status === 'in-progress' && !inFlight.has(task.id)) {
              inFlight.add(task.id);
              const childInput = yield* options.toChildInput(task);
              const pid = yield* Supervisor.delegate(options.childOperation, childInput);
              taskByPid.set(pid, task.id);
            }
          }
        });

        return {
          onInput: (input) => options.runTurn(input).pipe(Effect.zipRight(reconcile)),
          onChildEvent: (event) =>
            Effect.gen(function* () {
              if (event._tag !== 'exited') {
                return;
              }
              const taskId = taskByPid.get(event.pid);
              if (taskId === undefined) {
                return;
              }
              taskByPid.delete(event.pid);

              const exit = yield* Supervisor.collectResult<ChildOutput>(event.pid);
              const plan = yield* loadPlan;
              Obj.update(plan, (plan) => {
                const task = plan.tasks.find((task) => task.id === taskId);
                if (task) {
                  task.status = Exit.isSuccess(exit) ? 'done' : 'failed';
                }
              });

              yield* options.onComplete(taskId, exit);
            }),
        };
      }),
  );
