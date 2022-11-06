export type ClearCallback = () => void

/**
 * Schedule a task to run in the next event loop iteration.
 */
export const scheduleTask = (task: () => Promise<void>): ClearCallback => {
  const id = setTimeout(task);
  return () => clearTimeout(id);
}

/**
 * Run the task in the next event loop iteration, and then repeat in `interval` ms after the previous iteration completes.
 */
export const repeatTask = (task: () => Promise<void>, interval: number): ClearCallback => {
  let id: NodeJS.Timeout;

  const run = async () => {
    await task();
    id = setTimeout(run, interval);
  };

  id = setTimeout(run, interval);

  return () => clearTimeout(id);
}