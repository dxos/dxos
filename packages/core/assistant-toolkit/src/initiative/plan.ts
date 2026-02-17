import * as Schema from 'effect/Schema';
import * as Chat from '../chat/Chat';
import { Obj, Type } from '@dxos/echo';

export const TaskId = Schema.String.pipe(Schema.brand('@dxos/assistant-toolkit/TaskId'));
export type TaskId = Schema.Schema.Type<typeof TaskId>;

export const Task = Schema.Struct({
  /**
   * Short task ID unique within the plan.
   */
  id: TaskId,

  title: Schema.String.annotations({
    description: 'Task title and description.',
  }),

  status: Schema.Literal('todo', 'in-progress', 'done'),

  /**
   * Parent task ID.
   */
  parent: Schema.optional(TaskId).annotations({
    description: 'Parent task ID.',
  }),

  /**
   * Chat object that this task is associated with.
   */
  chat: Schema.optional(Type.Ref(Chat.Chat)),
});
export interface Task extends Schema.Schema.Type<typeof Task> {}

/**
 * Hierarchical collection of tasks for humans and agents to track progress.
 */
export const Plan = Schema.Struct({
  tasks: Schema.Array(Task),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Plan',
    version: '0.1.0',
  }),
);
export interface Plan extends Schema.Schema.Type<typeof Plan> {}

export const generateTaskId = (plan: Plan): TaskId => {
  const existingIds = plan.tasks
    .map((task) => {
      const [num, letter] = task.id.split('-');
      return parseInt(num);
    })
    .filter((_) => !isNaN(_));
  let newId;
  if (existingIds.length === 0) {
    newId = 1;
  } else {
    newId = Math.max(...existingIds) + 1;
  }
  // Add random suffix to avoid collisions.
  return TaskId.make(`${newId}-${crypto.randomUUID().slice(0, 2)}`);
};

/**
 * Add new tasks to a plan, generating IDs for new tasks.
 * Use inside an `Obj.change` callback.
 */
export const addTasks = (
  plan: Obj.Mutable<Plan>,
  tasks: (Pick<Task, 'title'> & Partial<Pick<Task, 'status' | 'parent' | 'chat'>>)[],
) => {
  for (const task of tasks) {
    const taskId = generateTaskId(plan);
    plan.tasks.push({ id: taskId, ...task, status: task.status ?? 'todo' });
  }
  return plan;
};

interface MakePlanProps {
  tasks: {
    title: string;
    status?: 'todo' | 'in-progress' | 'done';
  }[];
}

export const makePlan = (props: MakePlanProps): Plan => {
  const plan = Obj.make(Plan, { tasks: [] });
  Obj.change(plan, (plan) => {
    addTasks(plan, props.tasks);
  });
  return plan;
};

/**
 * Formats plan to markdown format.
 */
export const formatPlan = (plan: Plan): string => {
  return plan.tasks
    .map((task) => `- **${task.status?.toLocaleUpperCase()}**: ${task.title ?? 'No title'} <!-- id=${task.id} -->`)
    .join('\n');
};
