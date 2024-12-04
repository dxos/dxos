import { scheduler } from 'node:timers/promises';

/**
 * Waits for the event loop to complete all tasks including MessagePort events and their child async tasks.
 *
 * NOTE: Doesn't work in Node.js.
 *
 * @example
 * ```ts
 * const channel = new MessageChannel();
 * channel.port1.onmessage = (msg) => setTimeout(() => console.log(msg.data))
 * channel.port2.postMessage('test1')
 * await yieldToEventLoop()
 * console.log('test2')
 * // Will print 'test1' then 'test2'.
 * ```
 *
 */
export const yieldToEventLoop = async () => {
  if (supportsPrioritizedTaskScheduler) {
    await (scheduler as any).postTask(() => {}, { priority: 'background' });
  } else {
    await new Promise((resolve) => setTimeout(resolve));
  }
};

const runAfterEventLoopDrains = (callback: () => void) => {
  if (supportsPrioritizedTaskScheduler) {
    (scheduler as any).postTask(callback, { priority: 'background' });
  } else {
    setTimeout(callback);
  }
};

const supportsPrioritizedTaskScheduler = 'scheduler' in globalThis && typeof (scheduler as any).postTask === 'function';

/**
 * Lower values are higher priority.
 */
export type TaskPriority = number & { __TaskPriority: never };

export const TaskPriority = Object.freeze({
  Highest: 0 as TaskPriority,

  Rpc: 10 as TaskPriority,

  QueryExecution: 20 as TaskPriority,

  /**
   * High priority network tasks.
   */
  NetworkHigh: 30 as TaskPriority,

  /**
   * Network synchronization.
   */
  NetworkSync: 31 as TaskPriority,

  /**
   * Network low-priority tasks.
   */
  NetworkLow: 35 as TaskPriority,

  Indexing: 50 as TaskPriority,

  Background: 100 as TaskPriority,
});

class TaskEntry {
  priority: TaskPriority;
  callback: (() => void) | null;

  constructor(priority: TaskPriority, callback: (() => void) | null) {
    this.priority = priority;
    this.callback = callback;
  }
}

const PREALLOCATED_TASK_SLOTS = 32;

/**
 * Maximum number of task slots to maintain even if they are not used.
 */
const MAX_MAINTAINED_TASK_SLOTS = 1024;

/**
 * Prioritized task scheduler.
 */
export class PrioritizedScheduler {
  /**
   * Min heap of tasks.
   */
  #tasks: TaskEntry[] = Array(PREALLOCATED_TASK_SLOTS);
  #size = 0;

  constructor() {
    for (let i = 0; i < this.#tasks.length; i++) {
      this.#tasks[i] = new TaskEntry(0 as TaskPriority, null);
    }
  }

  /**
   * Queues a task to run at the specified priority.
   */
  queueTask(priority: TaskPriority, task: () => void) {
    this.#pushTask(priority, task);
  }

  /**
   * Runs the highest priority task.
   */
  runTask() {
    const task = this.#popTask();
    task.callback!();
    task.callback = null;
  }

  #pushTask(priority: TaskPriority, callback: () => void) {
    if (this.#size >= this.#tasks.length) {
      this.#tasks.push(new TaskEntry(priority, callback));
    } else {
      this.#tasks[this.#size].priority = priority;
      this.#tasks[this.#size].callback = callback;
    }
    heapifyUp(this.#tasks, this.#size);
    this.#size++;
  }

  #popTask(): TaskEntry {
    const task = this.#tasks[0];
    this.#size--;
    this.#tasks[0] = this.#tasks[this.#size];
    this.#tasks[this.#size] = task;
    heapifyDown(this.#tasks, this.#size);
    if (this.#size > MAX_MAINTAINED_TASK_SLOTS) {
      // Allow the array to shrink if it is too large.
      this.#tasks.length = this.#size;
    }
    return task;
  }
}

const GLOBAL_SCHEDULER = new PrioritizedScheduler();
const runOneGlobalTask = () => GLOBAL_SCHEDULER.runTask();

/**
 * Yields until the even loop is empty and the tasks with specified priority can run.
 */
export const yieldWithPriority = (priority: TaskPriority): Promise<void> => {
  const promise = new Promise<void>((resolve) => {
    GLOBAL_SCHEDULER.queueTask(priority, resolve);
  });
  runAfterEventLoopDrains(runOneGlobalTask);
  return promise;
};

/**
 * Min heap insertion.
 */
const heapifyUp = (heap: TaskEntry[], index: number) => {
  while (index > 0) {
    const parent = (index - 1) >> 1;
    if (heap[parent].priority <= heap[index].priority) {
      break;
    }
    const temp = heap[parent];
    heap[parent] = heap[index];
    heap[index] = temp;
    index = parent;
  }
};

const heapifyDown = (heap: TaskEntry[], size: number) => {
  let index = 0;
  while (true) {
    const left = 2 * index + 1;
    const right = 2 * index + 2;
    let smallest = index;
    if (left < size && heap[left].priority < heap[smallest].priority) {
      smallest = left;
    }
    if (right < size && heap[right].priority < heap[smallest].priority) {
      smallest = right;
    }
    if (smallest === index) {
      break;
    }
    const temp = heap[index];
    heap[index] = heap[smallest];
    heap[smallest] = temp;
    index = smallest;
  }
};
