//
// Copyright 2026 DXOS.org
//

type Task = { id: string; done: boolean; version: number };

declare const cache: Map<string, Task>;
declare const queue: { push: (task: Task) => void };
declare const render: () => void;

// #region
const finish = async (id: string) => {
  const previous = cache.get(id);
  if (!previous) {
    return;
  }

  const next = { ...previous, done: true };
  cache.set(id, next);
  render();

  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'If-Match': String(previous.version) },
    body: JSON.stringify({ done: true }),
  }).catch(() => undefined);

  if (!response) {
    queue.push(next); // Offline: replay later, somehow.
  } else if (response.status === 412) {
    cache.set(id, previous); // Conflict: drop the user's edit?
    render();
  }
};
// #endregion

export { finish };
